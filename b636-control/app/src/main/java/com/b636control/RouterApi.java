package com.b636control;

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
    private String token="";
    private boolean loggedIn=false;
    private final Map<String,String> cookies=new LinkedHashMap<>();
    public RouterApi(String ip) {
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
        HttpURLConnection c=(HttpURLConnection)new URL(base+path).openConnection();
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
                if(!h.getValue().isEmpty())token=h.getValue().get(0);
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
    public synchronized String get(String path)throws Exception{return send("GET",path,null);}
    private synchronized String post(String path,String xml)throws Exception{
        if(!loggedIn)throw new IOException("Log in first");
        try{
            String t=get("/api/webserver/token");
            String value=getValue(t,"token");
            if(value.isEmpty())value=getValue(t,"TokInfo");
            if(!value.isEmpty())token=value;
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
    public synchronized String login(String user,String pass)throws Exception{
        if(user.trim().isEmpty()||pass.isEmpty())throw new IllegalArgumentException("Login credentials required");
        loggedIn=false;
        String ses=get("/api/webserver/SesTokInfo");
        String tok=getValue(ses,"TokInfo");
        if(!tok.isEmpty())token=tok;
        String cookie=getValue(ses,"SesInfo");
        int sep=cookie.indexOf('=');
        if(sep>0)cookies.put(cookie.substring(0,sep),cookie.substring(sep+1));
        String hashed=Base64.getEncoder().encodeToString(shaHex(pass).getBytes(StandardCharsets.UTF_8));
        String auth=Base64.getEncoder().encodeToString(shaHex(user+hashed+token).getBytes(StandardCharsets.UTF_8));
        String xml="<request><Username>"+escape(user)+"</Username><Password>"+auth+"</Password><password_type>4</password_type></request>";
        String reply=send("POST","/api/user/login",xml);
        if(!getValue(reply,"response").equalsIgnoreCase("OK"))
            throw new IOException("Login rejected by router (firmware may use a different login scheme)");
        loggedIn=true;
        return "Connected to "+base;
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