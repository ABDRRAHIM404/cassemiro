package com.b636command;

import java.io.IOException;
import android.net.Network;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.math.BigInteger;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import okhttp3.*;

/**
 * Local Huawei HiLink XML client.
 * Login reproduces the SOURCE IMPLEMENTATION in degdag/huawei-manager,
 * HilinkClient.kt: fetchSessionInfo, SHA256 HEX->Base64 twice, password_type=4.
 *
 * All network calls happen on the executor, never Android's UI thread.
 * Tokens and credentials are held in RAM, never saved/logged.
 */
public final class RouterClient {
    public static final int[] LTE_BANDS = {1,3,5,7,8,20,28,32,38,40,41,42,43};
    private static final MediaType XML_MEDIA=MediaType.parse("application/xml; charset=UTF-8");
    private final String host,base;
    private final Map<String,Cookie> cookies=new ConcurrentHashMap<>();
    private final OkHttpClient client;
    private String token="";
    private boolean authenticated=false;
    private String lastError="";

    public RouterClient(String address){this(address,null);}
    public RouterClient(String address,Network wifiRoute){
        address=address.trim().replaceFirst("^https?://","").replaceAll("/.*$","");
        if(!address.matches("[0-9.]+"))throw new IllegalArgumentException("Enter a local router IPv4 address");
        String[] parts=address.split("\\.");
        if(parts.length!=4)throw new IllegalArgumentException("Invalid IPv4 address");
        int[] b=new int[4];
        try{for(int i=0;i<4;i++){b[i]=Integer.parseInt(parts[i]);if(b[i]<0||b[i]>255)throw new Exception();}}
        catch(Exception ex){throw new IllegalArgumentException("Invalid router IPv4 address");}
        if(!(b[0]==10||(b[0]==172&&b[1]>=16&&b[1]<=31)||(b[0]==192&&b[1]==168)))
            throw new IllegalArgumentException("Only private local router addresses are allowed");
        host=address;base="http://"+host;
        OkHttpClient.Builder builder=new OkHttpClient.Builder();
        if(wifiRoute!=null){
            // Explicit transport binding bypasses Android\'s default VPN route.
            // Use this only when the user selects Direct Wi-Fi.
            builder.socketFactory(wifiRoute.getSocketFactory());
            builder.dns(h -> Arrays.asList(wifiRoute.getAllByName(h)));
        }
        client=builder.cookieJar(new CookieJar(){
            @Override public void saveFromResponse(HttpUrl url,List<Cookie> received){
                for(Cookie c:received)cookies.put(c.name(),c);
            }
            @Override public List<Cookie> loadForRequest(HttpUrl url){
                List<Cookie> out=new ArrayList<>();
                for(Cookie c:cookies.values())if(c.matches(url))out.add(c);
                return out;
            }
        }).connectTimeout(12,java.util.concurrent.TimeUnit.SECONDS)
          .readTimeout(15,java.util.concurrent.TimeUnit.SECONDS)
          .followRedirects(true).build();
    }
    public String address(){return base;}
    public boolean loggedIn(){return authenticated;}
    public String error(){return lastError;}
    private static String safe(String s){return s==null?"":s.trim();}
    private static String esc(String s){return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&apos;");}

    private static final class XmlNode {
        final String name;
        final StringBuilder text=new StringBuilder();
        boolean hasChildren=false;
        XmlNode(String name){this.name=name;}
    }
    private static final class XmlResult {
        final Map<String,String> fields=new LinkedHashMap<>();
        String root="";
        String failure="";
    }
    /**
     * Use Android's actual XmlPullParser, NOT a DocumentBuilderFactory that
     * throws ParserConfigurationException on Android when XMLConstants
     * FEATURE_SECURE_PROCESSING is set. Reject DTD and bounded untrusted XML.
     */
    private static XmlResult parseRouterXml(String body){
        XmlResult result=new XmlResult();
        if(body==null||body.isEmpty()){result.failure="empty response";return result;}
        if(body.length()>1048576){result.failure="response too large";return result;}
        String xml=body;
        if(xml.charAt(0)=='\uFEFF')xml=xml.substring(1);
        if(java.util.regex.Pattern.compile("(?is)<!\\s*(?:doctype|entity)\\b").matcher(xml).find()){
            result.failure="DTD declarations rejected";return result;
        }
        try{
            org.xmlpull.v1.XmlPullParser parser=android.util.Xml.newPullParser();
            // Android defaults to no DTD processing. Never enable it.
            parser.setInput(new java.io.StringReader(xml));
            Deque<XmlNode> stack=new ArrayDeque<>();
            int events=0;
            for(int event=parser.getEventType();event!=org.xmlpull.v1.XmlPullParser.END_DOCUMENT;
                    event=parser.next()){
                if(++events>20000)throw new IllegalArgumentException("too many XML events");
                if(event==org.xmlpull.v1.XmlPullParser.START_TAG){
                    if(result.root.isEmpty())result.root=parser.getName();
                    if(!stack.isEmpty())stack.peek().hasChildren=true;
                    stack.push(new XmlNode(parser.getName()));
                } else if(event==org.xmlpull.v1.XmlPullParser.TEXT||
                          event==org.xmlpull.v1.XmlPullParser.CDSECT){
                    if(!stack.isEmpty()){
                        XmlNode node=stack.peek();
                        if(node.text.length()<65536)node.text.append(parser.getText());
                    }
                } else if(event==org.xmlpull.v1.XmlPullParser.END_TAG){
                    if(!stack.isEmpty()){
                        XmlNode done=stack.pop();
                        if(!done.hasChildren)result.fields.put(done.name,done.text.toString().trim());
                    }
                }
            }
        }catch(Exception ex){result.failure=ex.getClass().getSimpleName();}
        return result;
    }
    public static Map<String,String> fields(String xml){
        return parseRouterXml(xml).fields;
    }
    private static String prop(Map<String,String> m,String...keys){
        for(String key:keys){String v=m.get(key);if(v!=null&&!v.trim().isEmpty())return v.trim();}
        return "—";
    }
    public static String val(Map<String,String> m,String...keys){return prop(m,keys);}
    private static void assertSuccess(String path,String xml)throws IOException{
        Map<String,String> m=fields(xml);String code=safe(m.get("code"));
        if(!code.isEmpty())throw new IOException(path+" returned Huawei error "+code);
    }
    private String request(String path,String xml,String requestToken)throws Exception{
        if(!path.matches("/api/[a-zA-Z0-9_/-]+"))throw new IOException("Invalid API endpoint");
        Request.Builder req=new Request.Builder().url(base+path);
        if(xml!=null){
            req.header("__RequestVerificationToken",requestToken).header("X-Requested-With","XMLHttpRequest")
               .post(RequestBody.create(xml,XML_MEDIA));
        }
        else req.get();
        try(Response response=client.newCall(req.build()).execute()){
            String body=response.body()==null?"":response.body().string();
            String newToken=response.header("__RequestVerificationToken");
            if(newToken!=null&&!newToken.isEmpty())token=newToken.split("#")[0].trim();
            if(!response.isSuccessful())throw new IOException("HTTP "+response.code()+" from "+path);
            return body;
        }
    }
    /**
     * Network diagnostics report ONLY statuses, document roots, known Huawei error
     * codes and token presence. Never emit raw XML, tokens, cookies or passwords.
     * A 2xx HTML response can otherwise be misdiagnosed as a missing token.
     */
    private String documentRoot(String body){
        String value=body==null?"":body.trim();
        if(value.isEmpty())return "empty response body";
        if(value.startsWith("<!DOCTYPE html")||value.startsWith("<!doctype html")||
            value.toLowerCase(Locale.ROOT).startsWith("<html"))return "HTML document";
        if(value.startsWith("{")||value.startsWith("["))return "JSON";
        XmlResult parsed=parseRouterXml(body);
        if(!parsed.root.isEmpty())
            return "XML root <"+parsed.root+">"+
                (parsed.failure.isEmpty()?"":" (parse: "+parsed.failure+")");
        return "unrecognized response (parse: "+parsed.failure+")";
    }
    private String safeProbe(String path,boolean browserLike){
        StringBuilder out=new StringBuilder();
        try{
            Request.Builder request=new Request.Builder().url(base+path).get();
            if(browserLike)request.header("X-Requested-With","XMLHttpRequest");
            try(Response response=client.newCall(request.build()).execute()){
                ResponseBody body=response.body();
                String text=body==null?"":body.string();
                Map<String,String> m=fields(text);
                out.append("HTTP ").append(response.code())
                    .append("; ").append(documentRoot(text));
                String err=safe(m.get("code"));
                if(!err.isEmpty())out.append("; Huawei error ").append(err);
                out.append("; TokInfo ").append(safe(m.get("TokInfo")).isEmpty()?"absent":"present");
                out.append("; SesInfo ").append(safe(m.get("SesInfo")).isEmpty()?"absent":"present");
                String ct=response.header("Content-Type");
                if(ct!=null&&!ct.isEmpty()){
                    String subtype=ct.split(";",2)[0];
                    out.append("; content type ").append(subtype.length()>50?"long":subtype);
                }
                if(response.isRedirect())out.append("; redirect");
            }
        }catch(Exception ex){
            out.append(ex.getClass().getSimpleName()).append(" (")
               .append(ex.getMessage()==null?"no message":ex.getMessage()).append(")");
        }
        return out.toString();
    }
    public Map<String,String> sessionDiagnostics() {
        Map<String,String> result=new LinkedHashMap<>();
        result.put("Address",base);
        result.put("Home page GET",safeProbe("/",false));
        result.put("Huawei session GET",safeProbe("/api/webserver/SesTokInfo",false));
        result.put("Huawei session AJAX GET",safeProbe("/api/webserver/SesTokInfo",true));
        result.put("Huawei login-state GET",safeProbe("/api/user/state-login",false));
        result.put("Privacy","No password or session values transmitted in this report.");
        return result;
    }
    private String safeSessionError(String sessionXml){
        Map<String,String> response=fields(sessionXml);
        String code=safe(response.get("code"));
        if(!code.isEmpty())return "Huawei session API returned error code "+code+
            ". Open the no-password diagnostic test. Do not retry your password.";
        return "Huawei session API did not return TokInfo ("+documentRoot(sessionXml)+
            "). Open the no-password diagnostic test. Do not retry your password.";
    }
    /**
     * Exactly the Huawei Manager type-4 hash/login algorithm.
     * Not the previously guessed "raw SHA256" formula.
     */
    public synchronized void login(String user,String password)throws Exception{
        authenticated=false;lastError="";token="";cookies.clear();
        user=user.trim();
        if(user.isEmpty()||password.isEmpty())throw new IOException("Username and password are required");
        try{
            String sesXml=request("/api/webserver/SesTokInfo",null,"");
            assertSuccess("Session",sesXml);
            Map<String,String> session=fields(sesXml);
            String raw=safe(session.get("TokInfo")),ses=safe(session.get("SesInfo"));
            if(raw.isEmpty())throw new IOException(safeSessionError(sesXml));
            if(!ses.isEmpty()&&ses.contains("=")){
                int i=ses.indexOf('=');
                try{Cookie c=new Cookie.Builder().name(ses.substring(0,i).trim())
                        .value(ses.substring(i+1).trim()).hostOnlyDomain(host).path("/").build();
                    cookies.put(c.name(),c);}catch(Exception ignored){}
            } else if(!ses.isEmpty() && !cookies.containsKey("SessionID")){
                // Some firmware emits an opaque bare session; normalize for HiLink.
                Cookie c=new Cookie.Builder().name("SessionID").value(ses).hostOnlyDomain(host).path("/").build();
                cookies.put(c.name(),c);
            }
            String passHash=sha256hex(password);
            String passB64=Base64.getEncoder().encodeToString(passHash.getBytes(StandardCharsets.UTF_8));
            String finalHash=sha256hex(user+passB64+raw);
            String encoded=Base64.getEncoder().encodeToString(finalHash.getBytes(StandardCharsets.UTF_8));
            String body="<?xml version=\"1.0\" encoding=\"UTF-8\"?><request><Username>"
                +esc(user)+"</Username><Password>"+encoded+"</Password><password_type>4</password_type></request>";
            String reply=request("/api/user/login",body,raw);
            if(!"OK".equalsIgnoreCase(safe(fields(reply).get("response")))){
                assertSuccess("Login",reply);
                throw new IOException("Router did not confirm login. Avoid repeated attempts.");
            }
            token=raw;authenticated=true;
        }catch(Exception e){lastError=e.getMessage();throw e;}
    }
    private static String sha256hex(String value)throws Exception{
        byte[] digest=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder out=new StringBuilder();
        for(byte b:digest)out.append(String.format(Locale.ROOT,"%02x",b&255));
        return out.toString();
    }
    public synchronized Map<String,String> get(String endpoint)throws Exception{
        String path=endpoint.startsWith("/api/")?endpoint:"/api/"+endpoint;
        if(!authenticated&&!path.endsWith("/SesTokInfo")&&!path.endsWith("/state-login"))
            throw new IOException("Sign in first");
        String reply=request(path,null,"");assertSuccess(path,reply);
        return fields(reply);
    }
    public static final class Snapshot{
        public final long at=System.currentTimeMillis();
        public final Map<String,String> signal=new LinkedHashMap<>(),status=new LinkedHashMap<>(),
            traffic=new LinkedHashMap<>(),info=new LinkedHashMap<>(),plmn=new LinkedHashMap<>();
        public final Map<String,String> failures=new LinkedHashMap<>();
        public String get(String...keys){
            for(Map<String,String> m:List.of(signal,status,traffic,info,plmn)){
                String v=prop(m,keys);
                if(!v.equals("—"))return v;
            }
            return "—";
        }
    }
    // Cache slow-changing router metadata between polls instead of showing
    // empty placeholders 3 out of 4 samples. Never synthesize signal values.
    private final Map<String,String> cachedInfo=new LinkedHashMap<>();
    private final Map<String,String> cachedPlmn=new LinkedHashMap<>();
    public synchronized Snapshot poll(int tick)throws Exception{
        if(!authenticated)throw new IOException("Login required");
        Snapshot snap=new Snapshot();
        readInto(snap,"device/signal",snap.signal);
        readInto(snap,"monitoring/status",snap.status);
        readInto(snap,"monitoring/traffic-statistics",snap.traffic);
        if(tick%4==0 || cachedInfo.isEmpty()){
            Map<String,String> current=new LinkedHashMap<>();
            readInto(snap,"device/information",current);
            if(!current.isEmpty()){cachedInfo.clear();cachedInfo.putAll(current);}
        }
        if(tick%4==0 || cachedPlmn.isEmpty()){
            Map<String,String> current=new LinkedHashMap<>();
            readInto(snap,"net/current-plmn",current);
            if(!current.isEmpty()){cachedPlmn.clear();cachedPlmn.putAll(current);}
        }
        snap.info.putAll(cachedInfo);
        snap.plmn.putAll(cachedPlmn);
        return snap;
    }
    private void readInto(Snapshot snap,String ep,Map<String,String> dest){
        try{dest.putAll(get(ep));}catch(Exception e){snap.failures.put(ep,e.getMessage());}
    }
    /**
     * The /api/wlan/host-list response contains repeated <Host> elements.
     * Do not run it through fields(), which intentionally flattens values and
     * loses all but the final device.
     */
    public synchronized List<Map<String,String>> connectedHosts()throws Exception{
        if(!authenticated)throw new IOException("Login required");
        String response=request("/api/wlan/host-list",null,"");
        assertSuccess("/api/wlan/host-list",response);
        org.xmlpull.v1.XmlPullParser parser=android.util.Xml.newPullParser();
        parser.setInput(new java.io.StringReader(response));
        List<Map<String,String>> hosts=new ArrayList<>();
        Map<String,String> host=null;
        int hostDepth=-1;
        String field=null;
        StringBuilder textValue=new StringBuilder();
        int events=0;
        for(int event=parser.getEventType();event!=org.xmlpull.v1.XmlPullParser.END_DOCUMENT;
                event=parser.next()){
            if(++events>20000)throw new IOException("Host list is unexpectedly complex");
            if(event==org.xmlpull.v1.XmlPullParser.START_TAG){
                String name=parser.getName();
                if("Host".equalsIgnoreCase(name)&&host==null){
                    host=new LinkedHashMap<>();
                    hostDepth=parser.getDepth();
                    if(hosts.size()>=128)throw new IOException("Too many reported hosts");
                }else if(host!=null && parser.getDepth()==hostDepth+1){
                    field=name;
                    textValue.setLength(0);
                }
            }else if((event==org.xmlpull.v1.XmlPullParser.TEXT||
                       event==org.xmlpull.v1.XmlPullParser.CDSECT)&&field!=null){
                if(textValue.length()<4096)textValue.append(parser.getText());
            }else if(event==org.xmlpull.v1.XmlPullParser.END_TAG&&host!=null){
                if(field!=null && parser.getDepth()==hostDepth+1 &&
                    parser.getName().equals(field)){
                    host.put(field,textValue.toString().trim());
                    field=null;
                }else if("Host".equalsIgnoreCase(parser.getName())&&parser.getDepth()==hostDepth){
                    hosts.add(host);
                    host=null;hostDepth=-1;field=null;
                }
            }
        }
        return hosts;
    }
    public synchronized Map<String,String> readFeature(String ep)throws Exception{return get(ep);}
    private static String xml(Map<String,String> data){
        StringBuilder s=new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?><request>");
        // Use canonical Huawei XML field order for /api/net/net-mode, while
        // retaining the optional networkOption element for V10 firmware.
        String[] netKeys={"NetworkMode","NetworkBand","LTEBand","networkOption"};
        if(data.containsKey("NetworkMode")&&data.containsKey("LTEBand")){
            for(String k:netKeys){
                if(data.containsKey(k))
                    s.append('<').append(k).append('>').append(esc(data.get(k))).append("</").append(k).append('>');
            }
        }else{
            for(Map.Entry<String,String> e:data.entrySet()){
                String k=e.getKey();if(!k.matches("[A-Za-z][A-Za-z0-9_]*"))
                    throw new IllegalArgumentException("Invalid field");
                s.append('<').append(k).append('>').append(esc(e.getValue())).append("</").append(k).append('>');
            }
        }
        return s.append("</request>").toString();
    }
    /**
     * Huawei requires a fresh per-request CSRF token for authenticated POSTs.
     * GET telemetry does not consume it. The initial login TokInfo is only for
     * /api/user/login, not for later control requests.
     */
    public synchronized void postFeature(String endpoint,Map<String,String> fields)throws Exception{
        if(!authenticated)throw new IOException("Login required");
        String path=endpoint.startsWith("/api/")?endpoint:"/api/"+endpoint;
        if(!Set.of("/api/net/net-mode","/api/net/lock-cell","/api/dialup/mobile-dataswitch",
                "/api/device/control").contains(path))throw new IOException("Unverified API write blocked");
        // A login token is not necessarily a valid later POST token. Acquire a
        // fresh token from the current authenticated session BEFORE every write.
        // The old client reused raw TokInfo and returned Huawei error 125003.
        String fresh=refreshToken();
        if(fresh.isEmpty())throw new IOException("No fresh Huawei POST verification token");
        String result=request(path,xml(fields),fresh);
        try{
            assertSuccess(path,result);
        }catch(IOException e){
            if(e.getMessage()!=null && e.getMessage().contains("125003"))
                throw new IOException("Huawei rejected this setting request (125003). A fresh session POST token was used; the firmware may require another privilege. No change confirmed.");
            throw e;
        }
        if(!"OK".equalsIgnoreCase(safe(RouterClient.fields(result).get("response"))))
            throw new IOException("Router did not confirm the change");
    }
    private static String adaptPostToken(String raw)throws IOException{
        String value=safe(raw).split("#",2)[0].trim();
        // Huawei's 64-char /webserver/token value uses the second 32 chars for POST.
        if(value.length()==64)return value.substring(32);
        if(value.length()==32)return value;
        throw new IOException("Unexpected Huawei token format ("+value.length()+" characters)");
    }
    public synchronized String refreshToken()throws Exception{
        // This GET is authenticated by OkHttp's existing cookie jar.
        String rawXml=request("/api/webserver/token",null,"");
        assertSuccess("/api/webserver/token",rawXml);
        Map<String,String> response=fields(rawXml);
        String raw=safe(response.get("token"));
        if(raw.isEmpty())raw=safe(response.get("TokInfo"));
        if(raw.isEmpty())throw new IOException("Router didn't return a fresh write token");
        token=adaptPostToken(raw);
        return token;
    }
    private Map<String,String> currentNetworkSettings()throws Exception{
        return get("net/net-mode");
    }
    private static String modeValue(Map<String,String> settings,String key,String fallback){
        String s=safe(settings.get(key));
        return s.isEmpty()?fallback:s;
    }
    private static Map<String,String> modePayload(String mode,String networkBand,String lteBand){
        // Preserve field ordering from the successful reference Huawei Manager
        // POST payload; Map.of() had nondeterministic tag order.
        Map<String,String> data=new LinkedHashMap<>();
        data.put("NetworkMode",mode);
        data.put("NetworkBand",networkBand);
        data.put("LTEBand",lteBand);
        data.put("networkOption","");
        return data;
    }
    private void verifiedNetModeWrite(String lteMask)throws Exception{
        Map<String,String> old=currentNetworkSettings();
        String networkMode=modeValue(old,"NetworkMode","03");
        String networkBand=modeValue(old,"NetworkBand","3FFFFFFF");
        // Only LTEBand changes. Don't flip 4G-only to 2G/3G/4G without consent.
        postFeature("net/net-mode",modePayload(networkMode,networkBand,lteMask));
        Map<String,String> updated=currentNetworkSettings();
        String observed=safe(updated.get("LTEBand"));
        if(observed.isEmpty())
            throw new IOException("Router accepted the request but didn't return LTEBand for verification");
        try{
            BigInteger expected=new BigInteger(lteMask,16);
            BigInteger actual=new BigInteger(observed.replaceFirst("(?i)^0x",""),16);
            if(!expected.equals(actual))throw new IOException(
                "Router replied OK, but LTE band readback doesn't match. Actual mask: "+observed);
        }catch(NumberFormatException e){
            throw new IOException("LTE mask readback was not valid hex: "+observed);
        }
    }
    public void lockBands(Collection<Integer> selected)throws Exception{
        if(selected.isEmpty())throw new IOException("Select at least one LTE band");
        BigInteger mask=BigInteger.ZERO;
        for(int band:selected){
            if(Arrays.stream(LTE_BANDS).noneMatch(x->x==band))
                throw new IOException("Band B"+band+" isn't in the supported selection list");
            mask=mask.setBit(band-1);
        }
        verifiedNetModeWrite(mask.toString(16).toUpperCase(Locale.ROOT));
    }
    public void resetBandAuto()throws Exception{
        verifiedNetModeWrite("7FFFFFFFFFFFFFFF");
    }
    public void lockCell(long earfcn,int pci)throws Exception{
        if(earfcn<0||earfcn>300000||pci<0||pci>503)throw new IOException("Check EARFCN and PCI values");
        // Matches the Brovi Huawei CPE Manager's /api/net/lock-cell fields;
        // firmware support must be confirmed by the router's response.
        postFeature("net/lock-cell",Map.of("LockCell","1","Freq",""+earfcn,"PCI",""+pci));
    }
    public void releaseCell()throws Exception{
        postFeature("net/lock-cell",Map.of("LockCell","0","Freq","0","PCI","0"));
    }
    public void mobileData(boolean enabled)throws Exception{
        postFeature("dialup/mobile-dataswitch",Map.of("dataswitch",enabled?"1":"0"));
    }
    public void reboot()throws Exception{
        postFeature("device/control",Map.of("Control","1"));
    }
    public void close(){authenticated=false;token="";cookies.clear();client.dispatcher().cancelAll();}
}
