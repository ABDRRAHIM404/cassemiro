package com.b636command;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.RouteInfo;
import android.net.ProxyInfo;
import java.io.InputStream;
import java.net.*;
import java.nio.charset.StandardCharsets;

/**
 * Password-free diagnostics only: compare Android's default network with
 * explicit Wi-Fi sockets (which bypass split-tunnel VPN routing).
 *
 * Never read or print router session XML, cookies, tokens or passwords.
 */
final class NetworkProbe {
    private final ConnectivityManager cm;
    NetworkProbe(Context ctx) {
        cm=(ConnectivityManager)ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
    }
    /**
     * A VPN overlay can claim both WIFI and VPN transports. Only return the
     * non-VPN physical radio, never an inherited Wi-Fi VPN network.
     */
    Network wifi(){
        if(cm==null)return null;
        Network fallback=null;
        for(Network n:cm.getAllNetworks()){
            NetworkCapabilities c=cm.getNetworkCapabilities(n);
            if(c==null || !c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))continue;
            if(c.hasTransport(NetworkCapabilities.TRANSPORT_VPN) ||
                !c.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN))continue;
            if(fallback==null)fallback=n;
            String ip=ipv4(n);
            if(!ip.equals("no IPv4 address")&&!ip.equals("not reported"))return n;
        }
        return fallback;
    }
    private String inventory(){
        if(cm==null)return "Network service unavailable";
        Network[] available=cm.getAllNetworks();
        if(available.length==0)return "No networks visible to app";
        StringBuilder out=new StringBuilder();
        for(int i=0;i<Math.min(available.length,12);i++){
            Network n=available[i];NetworkCapabilities c=cm.getNetworkCapabilities(n);
            boolean physical=c!=null&&c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                &&!c.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
                &&c.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN);
            LinkProperties link=cm.getLinkProperties(n);
            out.append("Network #").append(i+1).append(": ").append(caps(n)).append("\n")
                .append("  IPv4 ").append(ipv4(n))
                .append(" | interface ").append(link==null?"unknown":link.getInterfaceName())
                .append(" | physical Wi-Fi ").append(physical?"YES":"no").append("\n");
        }
        if(available.length>12)out.append("More networks omitted\n");
        return out.toString();
    }
    private String caps(Network network){
        if(network==null)return "unknown";
        NetworkCapabilities c=cm.getNetworkCapabilities(network);
        if(c==null)return "not reported";
        StringBuilder s=new StringBuilder();
        if(c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI))s.append("Wi-Fi ");
        if(c.hasTransport(NetworkCapabilities.TRANSPORT_VPN))s.append("VPN ");
        if(c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR))s.append("Mobile ");
        if(c.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN))s.append("NOT-VPN ");
        else s.append("VPN-OVERLAY ");
        s.append(c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)?"Internet-capable ":"");
        s.append(c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)?"validated":"unvalidated");
        return s.toString();
    }
    private String ipv4(Network n){
        if(n==null)return "unavailable";
        LinkProperties lp=cm.getLinkProperties(n);
        if(lp==null)return "not reported";
        for(LinkAddress address:lp.getLinkAddresses()){
            InetAddress ip=address.getAddress();
            if(ip instanceof Inet4Address && !ip.isAnyLocalAddress())return ip.getHostAddress();
        }
        return "no IPv4 address";
    }
    private String gateway(Network n){
        if(n==null)return "unavailable";
        LinkProperties lp=cm.getLinkProperties(n);
        if(lp==null)return "not reported";
        for(RouteInfo route:lp.getRoutes()){
            InetAddress g=route.getGateway();
            if(route.isDefaultRoute() && g instanceof Inet4Address && !g.isAnyLocalAddress())
                return g.getHostAddress();
        }
        return "unknown (the 0.0.0.0 route is not a gateway)";
    }
    private String proxy(Network n){
        if(n==null)return "none";
        LinkProperties lp=cm.getLinkProperties(n);
        ProxyInfo p=lp==null?null:lp.getHttpProxy();
        if(p==null)return "none";
        if(p.getHost()==null||p.getHost().isEmpty())return "PAC / automatic";
        return p.getHost()+":"+p.getPort();
    }
    private static String causes(Throwable error){
        StringBuilder s=new StringBuilder();
        for(int i=0;i<4 && error!=null;i++,error=error.getCause()){
            if(i>0)s.append(" -> ");
            s.append(error.getClass().getSimpleName());
            String msg=error.getMessage();
            if(msg!=null){
                String low=msg.toLowerCase(java.util.Locale.ROOT);
                if(low.contains("network is unreachable")||low.contains("enetunreach"))
                    s.append(": network unreachable");
                else if(low.contains("eacces")||low.contains("permission denied"))
                    s.append(": permission denied");
                else if(low.contains("refused")||low.contains("econnrefused"))
                    s.append(": connection refused");
                else if(low.contains("timed out")||low.contains("etimedout"))
                    s.append(": timed out");
                else if(low.contains("vpn"))s.append(": VPN route");
            }
        }
        return s.toString();
    }
    private static String http(URL url,Network n,boolean useProxy,Proxy proxy) {
        HttpURLConnection c=null;
        try {
            if(useProxy){
                c=(HttpURLConnection)(n==null?url.openConnection(proxy):n.openConnection(url,proxy));
            } else {
                c=(HttpURLConnection)(n==null?url.openConnection(Proxy.NO_PROXY):n.openConnection(url,Proxy.NO_PROXY));
            }
            c.setConnectTimeout(1800);c.setReadTimeout(2300);
            c.setRequestMethod("GET");c.setInstanceFollowRedirects(false);
            int status=c.getResponseCode();
            String contentType=c.getContentType();
            // Do not read / display response bodies as these may contain credentials.
            return "HTTP "+status+(contentType==null?"":" ("+contentType.split(";")[0]+")");
        }catch(Exception e){return causes(e);}
        finally{if(c!=null)c.disconnect();}
    }
    private static String socket(Network n,String ip){
        Socket s=null;
        try {
            s=n==null?new Socket():n.getSocketFactory().createSocket();
            s.connect(new InetSocketAddress(ip,80),1800);
            return "TCP port 80 OPEN";
        }catch(Exception e){return causes(e);}
        finally{if(s!=null)try{s.close();}catch(Exception ignored){}}
    }
    String run(String ip){
        // RouterClient already validates a private IPv4 value.
        String address=new RouterClient(ip).address();
        String host=address.substring("http://".length());
        StringBuilder report=new StringBuilder();
        Network defaultNetwork=cm==null?null:cm.getActiveNetwork();
        Network wifiNetwork=wifi();
        report.append("B636 / ROUTING DIAGNOSTICS v1.3\n");
        report.append("VISIBLE NETWORKS\n").append(inventory()).append("\n");
        report.append("Default Android route: ").append(caps(defaultNetwork)).append("\n");
        report.append("Selected physical Wi-Fi: ").append(wifiNetwork==null?
            "NOT FOUND (VPN overlay excluded)":caps(wifiNetwork)).append("\n");
        report.append("Physical Wi-Fi IPv4: ").append(ipv4(wifiNetwork)).append("\n");
        report.append("Wi-Fi gateway: ").append(gateway(wifiNetwork)).append("\n");
        report.append("Wi-Fi HTTP proxy: ").append(proxy(wifiNetwork)).append("\n");
        report.append("A VPN app may apply per-app rules that aren't visible here.\n\n");
        report.append("DEFAULT ROUTE (no proxy)\n");
        report.append(socket(null,host)).append("\n");
        report.append(http(url(address+"/"),null,false,Proxy.NO_PROXY)).append("\n\n");
        report.append("EXPLICIT Wi-Fi ROUTE (no proxy)\n");
        if(wifiNetwork==null)
            report.append("No non-VPN Wi-Fi network visible. Direct test not attempted on VPN.");
        else{
            report.append(socket(wifiNetwork,host)).append("\n");
            report.append(http(url(address+"/"),wifiNetwork,false,Proxy.NO_PROXY));
        }
        report.append("\n\n");
        if(wifiNetwork!=null){
            LinkProperties lp=cm.getLinkProperties(wifiNetwork);
            ProxyInfo pi=lp==null?null:lp.getHttpProxy();
            if(pi!=null && pi.getHost()!=null&&!pi.getHost().isEmpty()&&pi.getPort()>0){
                report.append("WIFI PROXY TEST — no credentials\n");
                Proxy p=new Proxy(Proxy.Type.HTTP,new InetSocketAddress(pi.getHost(),pi.getPort()));
                report.append(http(url(address+"/"),wifiNetwork,true,p)).append("\n\n");
            }
        }
        report.append("No password, tokens or browser cookies sent.\n");
        report.append("If Wi-Fi route works but default fails, use Direct Wi-Fi in Login.\n");
        if(wifiNetwork==null)report.append("Check VPN per-app exclusions and Android 'Block connections without VPN' settings.");
        else report.append("If physical Wi-Fi fails too, verify its local IPv4 subnet and router access.");
        return report.toString();
    }
    private static URL url(String s){
        try{return new URL(s);}catch(Exception e){throw new IllegalArgumentException(e);}
    }
}
