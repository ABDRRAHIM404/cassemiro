package com.b636control;
import android.app.*;
import android.os.*;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.content.res.ColorStateList;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import java.util.*;
import java.util.concurrent.*;

/** Original native UI: B636 LTE, dual-band Wi-Fi and safe device tools. */
public class MainActivity extends Activity {
    final int BG=0xFF091421, CARD=0xFF142539, INSET=0xFF1D354B, WHITE=0xFFF2F7FB, MUTED=0xFFACC0D2, CYAN=0xFF52DDD4, YELLOW=0xFFFFD684;
    LinearLayout outer,area;TextView status;RouterApi router=new RouterApi("192.168.1.1");
    final LinkedHashSet<Integer> bands=new LinkedHashSet<>();
    final ExecutorService executor=Executors.newSingleThreadExecutor();
    final Handler handler=new Handler(Looper.getMainLooper());
    Map<String,String> latest=new LinkedHashMap<>();
    String tab="Dashboard";boolean busy=false;boolean alive=true;
    private android.net.Network wifiRoute(){
        android.net.ConnectivityManager cm=(android.net.ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        if(cm==null)return null;
        for(android.net.Network n:cm.getAllNetworks()){
            android.net.NetworkCapabilities caps=cm.getNetworkCapabilities(n);
            if(caps!=null&&caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI))return n;
        }
        return null;
    }
    private RouterApi routerFor(String ip){return new RouterApi(ip,wifiRoute());}
    private String networkInfo(){
        android.net.ConnectivityManager cm=(android.net.ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        android.net.Network wifi=wifiRoute();
        if(wifi==null)return "Android reports no connected Wi-Fi network. Connect to the router's Wi-Fi before testing.";
        String gateway="unknown";
        android.net.LinkProperties lp=cm.getLinkProperties(wifi);
        if(lp!=null)for(android.net.RouteInfo rt:lp.getRoutes()){
            if(rt.isDefaultRoute()&&rt.getGateway()!=null&&rt.getGateway() instanceof java.net.Inet4Address){gateway=rt.getGateway().getHostAddress();break;}
        }
        return "Connected Wi-Fi: yes\nAndroid Wi-Fi gateway: "+gateway
            +"\nActive Android route is Wi-Fi: "+wifi.equals(cm.getActiveNetwork())
            +"\nApp bypasses any HTTP proxy for local router requests.";
    }
    private int dp(int v){return (int)(v*getResources().getDisplayMetrics().density+0.5f);}
    private GradientDrawable bg(int c){GradientDrawable d=new GradientDrawable();d.setColor(c);d.setCornerRadius(dp(14));return d;}
    private LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(1);return l;}
    private void msg(LinearLayout parent,String label,int size,int color,boolean strong){
        TextView text=new TextView(this);text.setText(label);text.setTextSize(size);text.setTextColor(color);
        if(strong)text.setTypeface(null,Typeface.BOLD);text.setPadding(0,0,0,dp(9));
        parent.addView(text,new LinearLayout.LayoutParams(-1,-2));
    }
    private LinearLayout card(String heading,String subtitle){
        LinearLayout l=column();l.setPadding(dp(16),dp(16),dp(16),dp(16));l.setBackground(bg(CARD));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(12);area.addView(l,p);
        msg(l,heading,17,WHITE,true);if(subtitle!=null)msg(l,subtitle,12,MUTED,false);return l;
    }
    private Button button(LinearLayout parent,String title,Runnable action,boolean primary){
        Button b=new Button(this);b.setAllCaps(false);b.setText(title);b.setTextColor(primary?BG:WHITE);
        b.setTextSize(13);b.setBackground(bg(primary?CYAN:INSET));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(45));p.topMargin=dp(5);
        parent.addView(b,p);b.setOnClickListener(v->action.run());return b;
    }
    private EditText input(LinearLayout parent,String hint,String value,boolean password){
        msg(parent,hint,12,MUTED,true);EditText e=new EditText(this);e.setText(value);e.setSingleLine();
        e.setTextColor(WHITE);e.setTextSize(14);e.setBackground(bg(INSET));e.setPadding(dp(12),0,dp(12),0);
        if(password)e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(48));p.bottomMargin=dp(12);parent.addView(e,p);return e;
    }
    private void update(String m,boolean good){status.setText(m);status.setTextColor(good?CYAN:YELLOW);}
    interface Job<T>{T run()throws Exception;}
    interface Done<T>{void done(T value);}
    private <T> void call(String label,Job<T> job,Done<T> done){
        if(busy){Toast.makeText(this,"One router command at a time",Toast.LENGTH_SHORT).show();return;}
        busy=true;update(label,false);
        executor.execute(()->{
            try{T result=job.run();handler.post(()->{if(!alive)return;busy=false;update("Connected · "+router.address(),true);done.done(result);});}
            catch(Exception e){handler.post(()->{if(!alive)return;busy=false;String m=e.getMessage()==null?"Unknown router error":e.getMessage();update(m,false);new AlertDialog.Builder(this).setTitle("Router request failed").setMessage(m).setPositiveButton("OK",null).show();});}
        });
    }
    private void confirm(String title,String description,Runnable action){
        new AlertDialog.Builder(this).setTitle(title).setMessage(description).setNegativeButton("Cancel",null)
            .setPositiveButton("Apply",(d,w)->action.run()).show();
    }
    private void result(String message){new AlertDialog.Builder(this).setTitle("Router response").setMessage(message).setPositiveButton("Close",null).show();}
    private final Runnable autopoll=new Runnable(){@Override public void run(){
        if(!alive)return;
        if(router.loggedIn()&&tab.equals("Dashboard")&&!busy)refresh();
        handler.postDelayed(this,20000);
    }};
    @Override public void onCreate(Bundle state){super.onCreate(state);bands.add(7);
        getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
        outer=column();outer.setBackgroundColor(BG);setContentView(outer);
        outer.setOnApplyWindowInsetsListener((view,insets)->{
            view.setPadding(0,insets.getSystemWindowInsetTop(),0,insets.getSystemWindowInsetBottom());
            return insets;
        });
        outer.requestApplyInsets();
        LinearLayout header=column();header.setPadding(dp(18),dp(16),dp(18),dp(5));outer.addView(header);
        msg(header,"B636  /  CONTROL",23,WHITE,true);msg(header,"LTE bands · towers · 2.4 / 5 GHz Wi-Fi",12,MUTED,false);
        status=new TextView(this);status.setTextSize(12);status.setTextColor(YELLOW);
        header.addView(status);update("Not connected · 192.168.1.1",false);
        LinearLayout tabs=new LinearLayout(this);tabs.setPadding(dp(7),dp(8),dp(7),dp(8));outer.addView(tabs);
        for(String name:new String[]{"Dashboard","LTE","Wi-Fi","Tools"}){
            Button b=new Button(this);b.setText(name);b.setAllCaps(false);b.setTextColor(WHITE);
            b.setTextSize(11);b.setBackground(bg(INSET));
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(40),1);p.setMargins(dp(2),0,dp(2),0);
            tabs.addView(b,p);b.setOnClickListener(v->screen(name));
        }
        ScrollView scroller=new ScrollView(this);outer.addView(scroller,new LinearLayout.LayoutParams(-1,0,1));
        area=column();area.setPadding(dp(15),dp(6),dp(15),dp(22));scroller.addView(area);
        screen("Dashboard");handler.postDelayed(autopoll,20000);
    }
    @Override protected void onDestroy(){alive=false;handler.removeCallbacksAndMessages(null);executor.shutdownNow();super.onDestroy();}
    private void screen(String name){tab=name;area.removeAllViews();
        if(name.equals("Dashboard"))dashboard();
        else if(name.equals("LTE"))lte();
        else if(name.equals("Wi-Fi"))wifi();
        else tools();
    }
    private void dashboard(){
        LinearLayout login=card("Your router","Connect to 192.168.1.1 over your home Wi-Fi. Password is never saved.");
        EditText ip=input(login,"Router IP","192.168.1.1",false);
        EditText username=input(login,"Username","admin",false);

        EditText password=input(login,"Router password","",true);
        msg(login,"Login method (one attempt per tap)",12,MUTED,true);
        Spinner mode=new Spinner(this);
        String[] modes={"Auto","Type 4 (raw SHA256)","Type 4 (hex SHA256)","Type 0 (base64)"};
        mode.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,modes));
        login.addView(mode,new LinearLayout.LayoutParams(-1,dp(50)));
        msg(login,"Auto reads the router's password type. Do not retry rapidly if credentials are rejected.",12,MUTED,false);
        button(login,"Test router connection (no password)",()->{
            String addr=ip.getText().toString();
            call("Testing local Wi-Fi router...",()->{
                String info=networkInfo();
                try{return info+"\n\n"+routerFor(addr).probeConnection();}
                catch(Exception ex){throw new java.io.IOException(info+"\n\nHTTP connection failed: "+ex.getMessage(),ex);}
            },this::result);
        },false);
        button(login,"Check login diagnostics (no password)",()->{
            String ipValue=ip.getText().toString();
            call("Reading firmware login state...",()->routerFor(ipValue).diagnoseLogin(),this::result);
        },false);
        button(login,"Sign in & refresh",()->{
            String i=ip.getText().toString(),u=username.getText().toString(),p=password.getText().toString();
            String method=String.valueOf(mode.getSelectedItem());
            call("Authenticating...",()->{RouterApi instance=routerFor(i);instance.login(u,p,method);return instance;},instance->{
                router=instance;password.setText("");refresh();
            });
        },true);
        if(router.loggedIn())button(login,"Refresh readings",this::refresh,false);
        LinearLayout metrics=card("Live LTE signal & tower","Measurements returned by router, not invented values.");
        if(latest.isEmpty())msg(metrics,"Connect to display signal, tower and traffic telemetry.",13,MUTED,false);
        else {
            line(metrics,"Model","DeviceName");
            line(metrics,"Operator","FullName","NetworkType");
            line(metrics,"LTE band","band");
            line(metrics,"RSRP","rsrp");line(metrics,"RSRQ","rsrq");line(metrics,"SINR","sinr");line(metrics,"RSSI","rssi");
            line(metrics,"Cell ID","cell_id");line(metrics,"PCI","pci");line(metrics,"TAC","tac");
            line(metrics,"EARFCN","earfcn");line(metrics,"LTE download channel width","dlbandwidth");
            line(metrics,"LTE upload channel width","ulbandwidth");
            line(metrics,"Download rate, B/s","CurrentDownloadRate");line(metrics,"Upload rate, B/s","CurrentUploadRate");
            line(metrics,"Total downloaded, bytes","TotalDownload");line(metrics,"Total uploaded, bytes","TotalUpload");
            line(metrics,"Wi-Fi users","CurrentWifiUser");
            for(Map.Entry<String,String> e:latest.entrySet())if(e.getKey().startsWith("error:"))
                msg(metrics,e.getKey()+"  "+e.getValue(),11,YELLOW,false);
        }
        LinearLayout hints=card("Two different radios","LTE is your cellular Internet; Wi-Fi is your local connection.");
        msg(hints,"B7 = LTE 2600 MHz band. 5 GHz = your local Wi-Fi radio. The base station—not this app—allocates LTE channel bandwidth.",12,WHITE,false);
    }
    private void line(LinearLayout parent,String label,String... keys){msg(parent,label+"  ·  "+RouterApi.val(latest,keys),14,WHITE,false);}
    private void refresh(){
        if(!router.loggedIn()){result("Sign in first");return;}
        call("Reading real LTE telemetry...",()->router.dashboard(),values->{latest=values;if(tab.equals("Dashboard"))screen(tab);});
    }
    private void lte(){
        LinearLayout heading=card("LTE bands & cell control","The B636-336 is an LTE router; Wi-Fi 5 GHz is managed separately.");
        msg(heading,"Choose one or more LTE bands. Single-band locks can cut service. B7 is preselected based on your preferred band.",12,MUTED,false);
        button(heading,"Read LTE network configuration",()->inspect("/api/net/net-mode"),false);
        LinearLayout selection=card("Allowed LTE bands","You can select multiple supported radio bands.");
        for(int band:RouterApi.BANDS){
            CheckBox cb=new CheckBox(this);cb.setText("Band B"+band+(band==7?"  ·  2600 MHz":""));
            cb.setTextColor(WHITE);cb.setButtonTintList(ColorStateList.valueOf(CYAN));cb.setChecked(bands.contains(band));
            selection.addView(cb,new LinearLayout.LayoutParams(-1,dp(42)));
            cb.setOnCheckedChangeListener((v,on)->{if(on)bands.add(band);else bands.remove(band);});
        }
        button(selection,"Apply selected bands",()->{
            ArrayList<Integer> chosen=new ArrayList<>(bands);
            if(chosen.isEmpty()){result("Select at least one band");return;}
            confirm("Apply LTE bands?","This may disconnect cellular Internet. Requested: "+chosen,
                ()->call("Setting LTE bands...",()->router.bands(chosen,false),this::result));
        },true);
        button(selection,"Enable all LTE bands (automatic choice)",()->confirm("Restore all LTE bands?",
            "Let the router select from the entire LTE band mask.",()->call("Restoring bands...",()->router.bands(Collections.emptyList(),true),this::result)),false);
        LinearLayout tower=card("Cell tower, PCI and channel","Cell ID, PCI, TAC and EARFCN are available on Dashboard if the firmware exposes them.");
        msg(tower,"A specific tower/cell/PCI/ARFCN lock isn't a universal HiLink API. This app does not send guessed commands that may leave the router offline. LTE carrier bandwidth is controlled by the operator.",12,YELLOW,false);
    }
    private void wifi(){
        LinearLayout status=card("Dual-band Wi-Fi","2.4 GHz + 5 GHz Wi-Fi are separate from your 4G mobile bands.");
        msg(status,"Wi-Fi 5 GHz can use wider channels, but supported widths depend on router firmware and the local region. Read both profiles before changing settings.",12,WHITE,false);
        button(status,"Read Wi-Fi basic settings",()->inspect("/api/wlan/basic-settings"),false);
        button(status,"Read 5 GHz / multi-radio settings",()->inspect("/api/wlan/multi-basic-settings"),false);
        button(status,"Read Wi-Fi feature switches",()->inspect("/api/wlan/wifi-feature-switch"),false);
        LinearLayout edit=card("Wi-Fi channel & channel width","Experimental: firmware must expose a matching field; values are verified after write.");
        msg(edit,"The multi-radio 5 GHz endpoint is read-only until your firmware's per-radio format is confirmed. This prevents changing the wrong network.",12,YELLOW,false);
        String[] endpointNames={"2.4 GHz / basic","5 GHz / multi-radio"};
        Spinner e=new Spinner(this);e.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,endpointNames));
        edit.addView(e,new LinearLayout.LayoutParams(-1,dp(48)));
        String[] keys={"WifiChannel","WifiBandwidth","WifiChannelWidth","wifibandwidth"};
        Spinner k=new Spinner(this);k.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,keys));
        edit.addView(k,new LinearLayout.LayoutParams(-1,dp(48)));
        EditText value=input(edit,"Channel (e.g. 36) or bandwidth MHz (e.g. 80)","",false);
        button(edit,"Apply Wi-Fi setting (if exposed)",()->{
            String endpoint=e.getSelectedItemPosition()==0?"/api/wlan/basic-settings":"/api/wlan/multi-basic-settings";
            String key=String.valueOf(k.getSelectedItem()),num=value.getText().toString().trim();
            confirm("Change Wi-Fi setting?","Changing the channel may disconnect your phone temporarily.",
                ()->call("Validating Wi-Fi change...",()->router.changeWifi(endpoint,key,num),this::result));
        },true);
    }
    private void tools(){
        LinearLayout diagnostic=card("Firmware capability inspector","Read-only API probes; private data is redacted.");
        final String[] endpoints={"/api/device/information","/api/device/signal","/api/net/net-mode",
            "/api/wlan/basic-settings","/api/wlan/multi-basic-settings","/api/wlan/wifi-feature-switch",
            "/api/wlan/host-list","/api/monitoring/status","/api/monitoring/traffic-statistics",
            "/api/dialup/mobile-dataswitch","/api/net/current-plmn"};
        Spinner options=new Spinner(this);options.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,endpoints));
        diagnostic.addView(options,new LinearLayout.LayoutParams(-1,dp(52)));
        button(diagnostic,"Read selected endpoint",()->inspect(String.valueOf(options.getSelectedItem())),true);
        LinearLayout data=card("Mobile data","Switch cellular Internet on/off if supported by your firmware.");
        button(data,"Read data-switch state",()->inspect("/api/dialup/mobile-dataswitch"),false);
        button(data,"Enable mobile data",()->confirm("Enable mobile data?","Reconnect mobile Internet.",
            ()->call("Enabling mobile data...",()->router.mobileData(true),this::result)),true);
        button(data,"Disable mobile data",()->confirm("Disable mobile data?","Internet access will stop until re-enabled.",
            ()->call("Disabling mobile data...",()->router.mobileData(false),this::result)),false);
        LinearLayout power=card("Power controls","A reboot disconnects every device on this router temporarily.");
        button(power,"Reboot router",()->confirm("Reboot B636-336?","All local Wi-Fi and LTE sessions will temporarily disconnect.",
            ()->call("Rebooting...",()->router.reboot(),this::result)),false);
        LinearLayout unsupported=card("Not yet verified","Firmware-dependent features require the router's actual API responses.");
        msg(unsupported,"Direct tower locking, custom PCI/ARFCN write commands, per-device QoS and LTE carrier-width changes are not available as proven B636 writes in the studied repositories. These are not falsely presented as working controls.",12,MUTED,false);
    }
    private void inspect(String path){
        call("Reading "+path+" ...",()->router.get(path),raw->
            new AlertDialog.Builder(this).setTitle(path).setMessage(RouterApi.redact(raw)).setPositiveButton("Close",null).show());
    }
}