package com.b636control;

import android.net.Network;

import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;
import java.util.*;

/** Huawei local HiLink XML client. Password remains in memory only. */
public final class RouterApi {
    public static final int[] BANDS={1,3,5,7,8,20,28,32,38,40,41,42,43};
    private final String base;
    private final Network wifiTransport;
    private final Proxy httpProxy;
    private String token="";
    private boolean loggedIn=false;
    private final Map<String,String> cookies=new LinkedHashMap<>();
    public RouterApi(String ip) { this(ip, null, Proxy.NO_PROXY); }
    public RouterApi(String ip, Network wifiTransport) { this(ip, wifiTransport, Proxy.NO_PROXY); }
    public RouterApi(String ip, Network wifiTransport, Proxy httpProxy) {
        this.wifiTransport = wifiTransport;
        this.httpProxy = httpProxy == null ? Proxy.NO_PROXY : httpProxy;
        ip=ip.trim().replace("http://","").replace("https://","").replaceAll("/+$","");
        if(!ip.matches("[0-9.]+")) throw new IllegalArgumentException("Only local IPv4 router addresses are allowed");
        String[] parts=ip.split("\\.");
        if(parts.length!=4) throw new IllegalArgumentException("Invalid router IP");
        int[] a=new int[4];
        try { for(int n=0;n<4;n++){a[n]=Integer.parseInt(parts[n]);if(a[n]<0||a[n]>255) throw new Exception();} }
        catch(Exception ex){throw new IllegalArgumentException("Invalid router IP");}
        if(!(a[0]==10||(a[0]==192&&a[1]==168)||(a[0]==172&&a[1]>=16&&a[1]<=31)))
            throw new IllegalArgumentException("Use a private LAN router address");
        base="http://"+ip;
    }
    public boolean loggedIn(){return loggedIn;}
    public String address(){return base;}
    private synchronized String send(String method,String path,String payload) throws Exception {
        if(!path.matches("/api/[A-Za-z0-9_/-]+")) throw new IllegalArgumentException("Invalid API path");
        URL url = new URL(base+path);
        HttpURLConnection c = createConnection(url);
        c.setRequestMethod(method);
        c.setConnectTimeout(5000);c.setReadTimeout(7000);
        c.setRequestProperty("X-Requested-With","XMLHttpRequest");
        if(!token.isEmpty()) c.setRequestProperty("__RequestVerificationToken",token);
        if(!cookies.isEmpty()){
            List<String> parts=new ArrayList<>();
            for(Map.Entry<String,String> e:cookies.entrySet())parts.add(e.getKey()+"="+e.getValue());
            c.setRequestProperty("Cookie",String.join("; ",parts));
        }
        if(payload!=null){
            byte[] b=payload.getBytes(StandardCharsets.UTF_8);
            c.setDoOutput(true);c.setRequestProperty("Content-Type","application/xml; charset=UTF-8");
            c.setFixedLengthStreamingMode(b.length);
            try(OutputStream out=c.getOutputStream()){out.write(b);}
        }
        int code=c.getResponseCode();
        Map<String,List<String>> headers=c.getHeaderFields();
        for(Map.Entry<String,List<String>> h:headers.entrySet()){
            String k=h.getKey();if(k==null||h.getValue()==null)continue;
            if(k.equalsIgnoreCase("Set-Cookie"))for(String v:h.getValue()){
                String first=v.split(";",2)[0];int i=first.indexOf('=');if(i>0)cookies.put(first.substring(0,i).trim(),first.substring(i+1).trim());
            }
            if(k.equalsIgnoreCase("__RequestVerificationToken")||k.equalsIgnoreCase("__RequestVerificationTokenone"))
                if(!h.getValue().isEmpty())token=tokenForPost(h.getValue().get(0).split("#",2)[0].trim());
        }
        try(InputStream in=code>=400?c.getErrorStream():c.getInputStream()){
            if(in==null)throw new IOException("Router HTTP "+code);
            ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[8192];int got,limit=160000;
            while(out.size()<limit&&(got=in.read(buf,0,Math.min(buf.length,limit-out.size())))>0)out.write(buf,0,got);
            String response=out.toString("UTF-8");
            if(code>=400)throw new IOException("Router HTTP "+code+", error "+getValue(response,"code"));
            return response;
        }finally{c.disconnect();}
    }
    private HttpURLConnection createConnection(URL u) throws IOException {
        // All traffic remains bound to the selected Android route. Proxy routing
        // is opt-in for login, never silently enabled for credentials.
        return (HttpURLConnection)(wifiTransport == null
            ? u.openConnection(httpProxy)
            : wifiTransport.openConnection(u,httpProxy));
    }
    public synchronized String get(String path)throws Exception{return send("GET",path,null);}
    public synchronized String probeConnection() {
        StringBuilder report=new StringBuilder();
        report.append("HTTP ").append(base).append(" via ")
              .append(wifiTransport==null?"Android default route":"Wi-Fi route")
              .append(httpProxy==Proxy.NO_PROXY?" (direct)":" (configured HTTP proxy)");
        for(String endpoint:new String[]{"/","/api/webserver/SesTokInfo"}) {
            HttpURLConnection c=null;
            try {
                c=createConnection(new URL(base+endpoint));
                c.setRequestMethod("GET");
                c.setConnectTimeout(1900);
                c.setReadTimeout(2200);
                c.setInstanceFollowRedirects(false);
                c.setRequestProperty("X-Requested-With","XMLHttpRequest");
                int code=c.getResponseCode();
                report.append("\\n").append(endpoint).append(": HTTP ").append(code);
                if(endpoint.contains("SesTokInfo")&&code==200) {
                    String body="";
                    try(InputStream in=c.getInputStream()){
                        byte[] b=new byte[2048];int count=in.read(b);
                        if(count>0)body=new String(b,0,count,StandardCharsets.UTF_8);
                    }
                    report.append(body.contains("<TokInfo>")||body.contains("<SesInfo>")
                        ?" (Huawei session API detected)":" (response not recognized as Huawei XML)");
                }
            } catch(Exception ex) {
                report.append("\\n").append(endpoint).append(": ")
                      .append(ex.getClass().getSimpleName()).append(" - ")
                      .append(ex.getMessage()==null?"Connection failed":ex.getMessage());
            } finally {if(c!=null)c.disconnect();}
        }
        return report.toString();
    }
    private synchronized String post(String path,String xml)throws Exception{
        if(!loggedIn)throw new IOException("Log in first");
        try{
            String t=get("/api/webserver/token");
            String value=getValue(t,"token");
            if(value.isEmpty())value=getValue(t,"TokInfo");
            if(!value.isEmpty())token=tokenForPost(value);
        }catch(Exception ignored){}
        String reply=send("POST",path,xml);
        if(!getValue(reply,"response").equalsIgnoreCase("OK"))
            throw new IOException("Router rejected request, code "+getValue(reply,"code"));
        return reply;
    }
    private static String shaHex(String s)throws Exception{
        byte[] b=MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex=new StringBuilder();
        for(byte v:b)hex.append(String.format(Locale.US,"%02x",v&255));
        return hex.toString();
    }

    /** Exactly one credential attempt per tap, to avoid Huawei account lockouts. */
    public synchronized String login(String user,String pass)throws Exception{return login(user,pass,"Auto");}
    private static byte[] digest(byte[] bytes)throws Exception{
        return MessageDigest.getInstance("SHA-256").digest(bytes);
    }
    private static String b64(byte[] bytes){return Base64.getEncoder().encodeToString(bytes);}
    private static String tokenForPost(String value){
        return value.length()>32?value.substring(value.length()-32):value;
    }
    public synchronized String diagnoseLogin()throws Exception{
        String state=get("/api/user/state-login");
        String session=get("/api/webserver/SesTokInfo");
        return "Password type: "+getValue(state,"password_type")
          +"\nLocked: "+getValue(state,"lockstatus")
          +"\nRemaining attempts: "+getValue(state,"remaincount")
          +"\nWait time: "+getValue(state,"remainwaittime")
          +"\nSession cookie found: "+(!getValue(session,"SesInfo").isEmpty())
          +"\nVerification token length: "+getValue(session,"TokInfo").length()
          +"\nNo password or token contents are shown.";
    }
    public synchronized String login(String user,String pass,String scheme)throws Exception{
        if(user.trim().isEmpty()||pass.isEmpty())throw new IllegalArgumentException("Login credentials required");
        loggedIn=false;
        String state=get("/api/user/state-login");
        if("1".equals(getValue(state,"lockstatus")))
            throw new IOException("Router temporarily locked. Wait "+getValue(state,"remainwaittime")+" minutes before retrying.");
        String pType=getValue(state,"password_type");
        if(scheme.equals("Auto"))scheme="0".equals(pType)?"Type 0 (base64)":"Type 4 (raw SHA256)";
        String ses=get("/api/webserver/SesTokInfo");
        String rawToken=getValue(ses,"TokInfo");
        if(rawToken.isEmpty())throw new IOException("Router did not supply a login token");
        token=tokenForPost(rawToken);
        String cookie=getValue(ses,"SesInfo");
        int sep=cookie.indexOf('=');
        if(sep>0)cookies.put(cookie.substring(0,sep),cookie.substring(sep+1));
        if(scheme.equals("SCRAM challenge")){
            loginWithChallenge(user,pass);
            loggedIn=true;
            return "Connected to "+base+" using SCRAM challenge";
        }
        String pwd,loginType;
        if(scheme.equals("Type 0 (base64)")){
            pwd=b64(pass.getBytes(StandardCharsets.UTF_8));loginType="0";
        }else if(scheme.equals("Type 4 (raw SHA256)")){
            String inner=b64(digest(pass.getBytes(StandardCharsets.UTF_8)));
            pwd=b64(digest((user+inner+rawToken).getBytes(StandardCharsets.UTF_8)));loginType="4";
        }else if(scheme.equals("Type 4 (hex SHA256)")){
            String inner=b64(shaHex(pass).getBytes(StandardCharsets.UTF_8));
            pwd=b64(shaHex(user+inner+rawToken).getBytes(StandardCharsets.UTF_8));loginType="4";
        }else throw new IllegalArgumentException("Unsupported login method");
        String xml="<request><Username>"+escape(user)+"</Username><Password>"+pwd+
              "</Password><password_type>"+loginType+"</password_type></request>";
        String reply=send("POST","/api/user/login",xml);
        if(!getValue(reply,"response").equalsIgnoreCase("OK")){
            String code=getValue(reply,"code");
            String count=getValue(reply,"remaincount");
            if(code.equals("108007"))throw new IOException("Login temporarily locked (108007). Stop retrying.");
            if(code.equals("125003")||code.equals("125002")||code.equals("125001"))
                throw new IOException("Router rejected the security token (code "+code+"). Close any browser router sessions and try again.");
            throw new IOException("Login rejected using "+scheme+
                 (code.isEmpty()?" (unknown router error)":" (router code "+code+")")+
                 (count.isEmpty()?"":". Attempts remaining: "+count)+
                 ". Please avoid repeated attempts.");
        }
        loggedIn=true;
        return "Connected to "+base;
    }

    /** Huawei's SCRAM / PBKDF2 flow: explicit opt-in, never try multiple passwords per tap. */
    private void loginWithChallenge(String user, String pass) throws Exception {
        byte[] random=new byte[32];new java.security.SecureRandom().nextBytes(random);
        String first=hex(random);
        String challenge=send("POST","/api/user/challenge_login",
            "<request><username>"+escape(user)+"</username><firstnonce>"+first+"</firstnonce><mode>1</mode></request>");
        String error=getValue(challenge,"code");
        if(!error.isEmpty())throw new IOException("Challenge login rejected (router code "+error+"). Do not retry repeatedly.");
        String serverNonce=getValue(challenge,"servernonce");
        String salt=getValue(challenge,"salt");
        int rounds;
        try{rounds=Integer.parseInt(getValue(challenge,"iterations"));}
        catch(Exception e){throw new IOException("Unsupported SCRAM challenge response: missing iterations");}
        if(!serverNonce.startsWith(first)||salt.isEmpty()||rounds<1||rounds>1000000)
            throw new IOException("Invalid SCRAM challenge (nonce, salt or iterations)");
        byte[] salted=javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            .generateSecret(new javax.crypto.spec.PBEKeySpec(pass.toCharArray(),unhex(salt),rounds,256)).getEncoded();
        byte[] clientKey=hmac(salted,"Client Key".getBytes(StandardCharsets.UTF_8));
        String authMessage=first+","+serverNonce+","+serverNonce;
        byte[] signature=hmac(digest(clientKey),authMessage.getBytes(StandardCharsets.UTF_8));
        byte[] proof=new byte[clientKey.length];
        for(int i=0;i<proof.length;i++)proof[i]=(byte)(clientKey[i]^signature[i]);
        String result=send("POST","/api/user/authentication_login",
            "<request><clientproof>"+hex(proof)+"</clientproof><finalnonce>"+escape(serverNonce)+"</finalnonce><logintype>1</logintype></request>");
        String err=getValue(result,"code");
        if(!err.isEmpty())throw new IOException("SCRAM authentication rejected (router code "+err+").");
        String serverSignature=getValue(result,"serversignature");
        if(!serverSignature.isEmpty()){
            byte[] serverKey=hmac(salted,"Server Key".getBytes(StandardCharsets.UTF_8));
            String expected=hex(hmac(serverKey,authMessage.getBytes(StandardCharsets.UTF_8)));
            if(!expected.equalsIgnoreCase(serverSignature))throw new IOException("Router SCRAM server signature mismatch");
        }else if(!getValue(result,"response").equalsIgnoreCase("OK")){
            throw new IOException("Router did not confirm SCRAM authentication");
        }
    }
    private static String hex(byte[] bytes){
        StringBuilder out=new StringBuilder();
        for(byte b:bytes)out.append(String.format(Locale.US,"%02x",b&255));
        return out.toString();
    }
    private static byte[] unhex(String hex){
        if(hex.length()%2!=0||hex.length()>1024)throw new IllegalArgumentException("Invalid SCRAM salt");
        byte[] out=new byte[hex.length()/2];
        for(int i=0;i<out.length;i++)out[i]=(byte)Integer.parseInt(hex.substring(i*2,i*2+2),16);
        return out;
    }
    private static byte[] hmac(byte[] key,byte[] message)throws Exception {
        javax.crypto.Mac mac=javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(key,"HmacSHA256"));
        return mac.doFinal(message);
    }
    public static String escape(String s){return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&apos;");}
    public static String getValue(String xml,String name){
        try{
            DocumentBuilderFactory factory=DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING,true);
            factory.setExpandEntityReferences(false);
            NodeList nodes=factory.newDocumentBuilder()
              .parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))).getElementsByTagName(name);
            return nodes.getLength()>0?nodes.item(0).getTextContent().trim():"";
        }catch(Exception ex){return "";}
    }
    public static Map<String,String> fields(String xml){
        Map<String,String> map=new LinkedHashMap<>();
        try{
            DocumentBuilderFactory f=DocumentBuilderFactory.newInstance();
            f.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
            f.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING,true);
            NodeList nodes=f.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))).getDocumentElement().getChildNodes();
            for(int i=0;i<nodes.getLength();i++){
                Node n=nodes.item(i);if(n.getNodeType()==Node.ELEMENT_NODE)map.put(n.getNodeName(),n.getTextContent().trim());
            }
        }catch(Exception ignored){}
        return map;
    }
    public static String val(Map<String,String> map,String...keys){
        for(String key:keys)for(Map.Entry<String,String> e:map.entrySet())
            if(e.getKey().equalsIgnoreCase(key)&&!e.getValue().trim().isEmpty())return e.getValue();
        return "—";
    }
    public static String redact(String xml){
        for(String key:new String[]{"Password","password","WifiWpapsk","WifiWpaPsk","WifiKey","WifiPassphrase","PreSharedKey","token","TokInfo","SesInfo","SerialNumber","IMEI","Imei","IMSI","imsi","Iccid"})
            xml=xml.replaceAll("(?is)<"+key+">.*?</"+key+">","<"+key+">[REDACTED]</"+key+">");
        return xml.length()>12000?xml.substring(0,12000)+"...[truncated]":xml;
    }
    public synchronized Map<String,String> dashboard()throws Exception{
        Map<String,String> result=new LinkedHashMap<>();
        for(String path:new String[]{"/api/device/signal","/api/device/information","/api/monitoring/status","/api/monitoring/traffic-statistics","/api/net/net-mode","/api/net/current-plmn"}){
            try{result.putAll(fields(get(path)));}
            catch(Exception e){result.put("error:"+path,e.getMessage());}
        }
        return result;
    }
    public synchronized String bands(List<Integer> selection,boolean automatic)throws Exception{
        if(!automatic&&selection.isEmpty())throw new IllegalArgumentException("Select LTE bands");
        long mask=0L;
        for(int n:selection){
            boolean supported=false;for(int b:BANDS)if(b==n)supported=true;
            if(!supported)throw new IllegalArgumentException("Unsupported LTE band B"+n);
            mask|=(1L<<(n-1));
        }
        String hex=automatic?"7FFFFFFFFFFFFFFF":Long.toHexString(mask).toUpperCase(Locale.US);
        String current=get("/api/net/net-mode");
        Map<String,String> f=fields(current);
        String nb=val(f,"NetworkBand");if(nb.equals("—"))nb="3FFFFFFF";
        String opt=val(f,"networkOption");if(opt.equals("—"))opt="";
        // Keep LTE mode while restoring all-band automatic choice.
        post("/api/net/net-mode","<request><NetworkMode>03</NetworkMode><NetworkBand>"+escape(nb)+"</NetworkBand><LTEBand>"+hex+"</LTEBand><networkOption>"+escape(opt)+"</networkOption></request>");
        return "Router accepted LTE bands "+(automatic?"(all)":selection)+" — verify connected band after refresh.";
    }
    public synchronized String mobileData(boolean on)throws Exception{
        post("/api/dialup/mobile-dataswitch","<request><dataswitch>"+(on?"1":"0")+"</dataswitch></request>");
        return "Mobile data "+(on?"enabled":"disabled");
    }
    public synchronized String reboot()throws Exception{
        post("/api/device/control","<request><Control>1</Control></request>");
        return "Router reboot command accepted";
    }
    public synchronized String changeWifi(String endpoint,String key,String value)throws Exception{
        if(!endpoint.equals("/api/wlan/basic-settings")&&!endpoint.equals("/api/wlan/multi-basic-settings"))
            throw new IllegalArgumentException("Invalid Wi-Fi endpoint");
        if(!Arrays.asList("WifiChannel","WifiBandwidth","WifiChannelWidth","wifibandwidth").contains(key))
            throw new IllegalArgumentException("Unverified Wi-Fi field");
        if(!value.matches("[0-9]{1,3}"))throw new IllegalArgumentException("Numeric channel or width required");
        String raw=get(endpoint);
        if(!fields(raw).containsKey(key))throw new IOException("Firmware does not expose field: "+key);
        if(endpoint.endsWith("multi-basic-settings"))
            throw new IOException("5 GHz dual-band edit blocked: radio index schema must be confirmed on real firmware. Use router WebUI.");
        post(endpoint,"<request><"+key+">"+value+"</"+key+"></request>");
        String observed=val(fields(get(endpoint)),key);
        if(!observed.equals(value))throw new IOException("Router did not verify setting: "+key+"="+observed);
        return "Wi-Fi "+key+"="+value+" verified";
    }
}