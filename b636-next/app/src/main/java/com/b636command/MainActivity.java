package com.b636command;

import android.app.*;
import android.os.*;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.content.*;
import android.content.res.ColorStateList;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import java.util.*;
import java.util.concurrent.*;

/** Native Android interface to the real B636 Huawei XML API. */
public final class MainActivity extends Activity {
    private static final int BG=0xFF07131E, SURFACE=0xFF112334, INSET=0xFF1B3445,
        TEXT=0xFFECF5F8, SUB=0xFFA7C0CC, AQUA=0xFF52E0CE, AMBER=0xFFFFCA80, RED=0xFFFF8D83;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final Map<String,TextView> metrics=new LinkedHashMap<>();
    private final LinkedHashSet<Integer> selectedBands=new LinkedHashSet<>();
    private RouterClient router=new RouterClient("192.168.1.1");
    private RouterClient.Snapshot last;
    private LinearLayout root,body,bar;private TextView connection,updated;
    private SignalGraph graph;
    private LinearLayout deviceResults,wifiOverview;
    private String page="Live";private boolean busy=false,active=false;
    private int tick=0;
    private final Runnable poller=new Runnable(){@Override public void run(){
        if(active&&router.loggedIn()&&!busy){
            busy=true;
            io.execute(()->{
                try{
                    RouterClient.Snapshot snap=router.poll(++tick);
                    ui.post(()->{busy=false;if(!active)return;last=snap;updateLive(snap);});
                }catch(Exception e){ui.post(()->{busy=false;setStatus("Live poll error: "+brief(e),false);});}
            });
        }
        if(active)ui.postDelayed(this,3000);
    }};
    private int dp(float n){return (int)(getResources().getDisplayMetrics().density*n+0.5f);}
    private GradientDrawable bg(int color,int radius){
        GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;
    }
    private LinearLayout vertical(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    private TextView text(String s,int sp,int color,boolean bold){
        TextView t=new TextView(this);t.setText(s);t.setTextColor(color);t.setTextSize(sp);
        if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);t.setGravity(Gravity.CENTER_VERTICAL);
        return t;
    }
    private LinearLayout box(LinearLayout parent,String heading,String hint){
        LinearLayout card=vertical();card.setPadding(dp(16),dp(15),dp(16),dp(15));
        card.setBackground(bg(SURFACE,19));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);
        lp.setMargins(dp(4),dp(3),dp(4),dp(12));parent.addView(card,lp);
        TextView title=text(heading,17,TEXT,true);card.addView(title);
        if(hint!=null){
            TextView note=text(hint,12,SUB,false);note.setPadding(0,dp(5),0,dp(8));card.addView(note);
        }
        return card;
    }
    private void note(LinearLayout parent,String label,int color){
        TextView t=text(label,12,color,false);t.setPadding(dp(2),dp(6),dp(2),dp(8));parent.addView(t);
    }
    private Button button(LinearLayout parent,String label,boolean primary,Runnable onClick){
        Button b=new Button(this);b.setAllCaps(false);b.setText(label);
        b.setTextSize(13);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        b.setTextColor(primary?BG:TEXT);b.setBackground(bg(primary?AQUA:INSET,12));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(47));lp.topMargin=dp(7);
        parent.addView(b,lp);b.setOnClickListener(v->onClick.run());return b;
    }
    private EditText field(LinearLayout parent,String label,String initial,boolean secret){
        note(parent,label,SUB);
        EditText e=new EditText(this);e.setSingleLine();e.setTextColor(TEXT);
        e.setHintTextColor(SUB);e.setTextSize(14);e.setText(initial);
        e.setPadding(dp(14),0,dp(14),0);e.setBackground(bg(INSET,12));
        if(secret)e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(49));lp.bottomMargin=dp(4);
        parent.addView(e,lp);return e;
    }
    private void setStatus(String label,boolean good){
        connection.setText(label);connection.setTextColor(good?AQUA:AMBER);
    }
    private String brief(Exception e){return e.getMessage()==null?e.getClass().getSimpleName():e.getMessage();}
    private interface Job<T>{T run()throws Exception;}
    private interface OnDone<T>{void accept(T result);}
    private <T> void run(String label,Job<T> task,OnDone<T> done){
        if(busy){Toast.makeText(this,"Another router operation is running",Toast.LENGTH_SHORT).show();return;}
        busy=true;setStatus(label,false);
        io.execute(()->{
            try{T val=task.run();ui.post(()->{busy=false;setStatus(router.loggedIn()?"Connected to "+router.address():"Ready",true);done.accept(val);});}
            catch(Exception e){ui.post(()->{busy=false;setStatus(brief(e),false);
                new AlertDialog.Builder(this).setTitle("Router response").setMessage(brief(e))
                    .setPositiveButton("Close",null).show();});}
        });
    }
    private void confirm(String title,String message,Runnable action){
        new AlertDialog.Builder(this).setTitle(title).setMessage(message)
            .setNegativeButton("Cancel",null).setPositiveButton("Confirm",(d,w)->action.run()).show();
    }
    private void popup(String heading,String body){
        new AlertDialog.Builder(this).setTitle(heading).setMessage(body)
            .setPositiveButton("Close",null).show();
    }
    @Override public void onCreate(Bundle state){
        super.onCreate(state);getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
        selectedBands.add(7);
        root=vertical();root.setBackgroundColor(BG);setContentView(root);
        root.setOnApplyWindowInsetsListener((v,i)->{
            v.setPadding(0,i.getSystemWindowInsetTop(),0,i.getSystemWindowInsetBottom());return i;
        });root.requestApplyInsets();
        LinearLayout head=vertical();head.setPadding(dp(20),dp(20),dp(20),dp(12));root.addView(head);
        head.addView(text("B636  /  COMMAND",23,TEXT,true));
        head.addView(text("Huawei LTE & dual-band Wi-Fi control",12,SUB,false));
        connection=text("Not connected · 192.168.1.1",12,AMBER,false);
        connection.setPadding(0,dp(9),0,dp(3));head.addView(connection);
        HorizontalScrollView scrollNav=new HorizontalScrollView(this);scrollNav.setHorizontalScrollBarEnabled(false);
        bar=new LinearLayout(this);bar.setPadding(dp(12),dp(3),dp(12),dp(6));
        scrollNav.addView(bar);root.addView(scrollNav,new LinearLayout.LayoutParams(-1,dp(58)));
        ScrollView sc=new ScrollView(this);sc.setFillViewport(false);
        root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
        body=vertical();body.setPadding(dp(12),dp(4),dp(12),dp(20));sc.addView(body);
        tabs();show("Live");
    }
    @Override public void onResume(){super.onResume();active=true;ui.removeCallbacks(poller);ui.postDelayed(poller,1000);}
    @Override public void onPause(){active=false;ui.removeCallbacks(poller);super.onPause();}
    @Override public void onDestroy(){io.shutdownNow();router.close();super.onDestroy();}
    private void tabs(){
        bar.removeAllViews();
        for(String tab:new String[]{"Live","LTE","Wi-Fi","Clients","Tools","Login"}){
            Button b=new Button(this);b.setAllCaps(false);b.setText(tab);b.setTextSize(12);
            b.setTextColor(tab.equals(page)?BG:TEXT);
            b.setBackground(bg(tab.equals(page)?AQUA:INSET,13));
            LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(dp(tab.equals("Clients")?88:74),dp(44));
            lp.setMargins(dp(3),0,dp(3),0);bar.addView(b,lp);b.setOnClickListener(v->show(tab));
        }
    }
    private void show(String tab){
        page=tab;tabs();metrics.clear();graph=null;deviceResults=null;wifiOverview=null;body.removeAllViews();updated=null;
        switch(tab){
            case "Live": live();break;case "LTE": cellular();break;
            case "Wi-Fi": wifi();break;case "Clients":clients();break;
            case "Tools":tools();break;default:login();
        }
        if(tab.equals("Live")&&last!=null)updateLive(last);
    }
    private void metricCell(LinearLayout row,String key,String label){
        LinearLayout wrapper=vertical();wrapper.setBackground(bg(INSET,13));
        wrapper.setPadding(dp(12),dp(12),dp(10),dp(12));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(84),1);
        lp.setMargins(dp(3),dp(3),dp(3),dp(3));row.addView(wrapper,lp);
        wrapper.addView(text(label,11,SUB,false));
        TextView value=text("—",23,TEXT,true);wrapper.addView(value);metrics.put(key,value);
    }
    private void metricRow(String a,String la,String b,String lb,LinearLayout card){
        LinearLayout row=new LinearLayout(this);row.setOrientation(LinearLayout.HORIZONTAL);card.addView(row);
        metricCell(row,a,la);metricCell(row,b,lb);
    }
    private void live(){
        LinearLayout overview=box(body,"Live signal monitor","Actual router measurements · refresh every 3 seconds while app is visible");
        updated=text(router.loggedIn()?"Reading measurements…":"Login is required for live data",12,SUB,false);
        overview.addView(updated);
        metricRow("rsrp","RSRP · dBm","sinr","SINR · dB",overview);
        metricRow("rsrq","RSRQ · dB","rssi","RSSI · dBm",overview);
        graph=new SignalGraph(this);LinearLayout.LayoutParams gp=new LinearLayout.LayoutParams(-1,dp(210));
        gp.setMargins(0,dp(12),0,0);overview.addView(graph,gp);
        LinearLayout network=box(body,"Serving tower","LTE identity and carrier measurements");
        metricRow("band","Serving LTE band","pci","PCI",network);
        metricRow("cell","Cell ID","earfcn","EARFCN",network);
        metricRow("dlwidth","LTE DL bandwidth","ulwidth","LTE UL bandwidth",network);
        metricRow("down","Download","up","Upload",network);
        metricRow("users","Wi-Fi users","mode","Connection mode",network);
        button(network,"Read neighbor cells / CA details",false,()->readMultiple("Cell and aggregation",
            new String[]{"device/seccellinfo","device/nbrcellinfo","net/cell-info"}));
        note(body,"LTE channel width is allocated by the operator; the router cannot demand a specific MHz allocation.",SUB);
    }
    private static String value(String s){return s==null||s.isEmpty()?"—":s;}
    private static String prettyRate(String raw){
        try{
            double bytes=Double.parseDouble(raw);
            if(bytes<=0)return "0 kbps";
            double kbps=bytes*8d/1000d;
            if(kbps<1000)return String.format(Locale.US,"%.1f kbps",kbps);
            return String.format(Locale.US,"%.2f Mbps",kbps/1000d);
        }catch(Exception e){return value(raw);}
    }
    private static String readableBand(String raw){
        if(raw==null||raw.equals("—"))return "—";
        java.util.regex.Matcher m=java.util.regex.Pattern.compile("\\\\bB(\\\\d+)\\\\b")
            .matcher(raw);
        if(m.find())return "B"+m.group(1);
        return raw;
    }
    private static String modeCode(String raw){
        if(raw==null||raw.equals("—"))return "—";
        if(raw.matches("\\\\d+"))return "Code "+raw;
        return raw;
    }
    private void set(String key,String s){TextView v=metrics.get(key);if(v!=null)v.setText(value(s));}
    private void updateLive(RouterClient.Snapshot snap){
        if(!page.equals("Live"))return;
        if(updated!=null)updated.setText("Last router response: "+new java.text.SimpleDateFormat("HH:mm:ss",Locale.getDefault())
            .format(new Date(snap.at))+(snap.failures.isEmpty()?" · all queried endpoints responded":" · "+snap.failures.size()+" endpoint warning(s)"));
        set("rsrp",snap.get("rsrp"));set("sinr",snap.get("sinr"));
        set("rsrq",snap.get("rsrq"));set("rssi",snap.get("rssi"));
        set("band",readableBand(snap.get("band","BandLTEWork")));set("pci",snap.get("pci"));
        set("cell",snap.get("cell_id","CellID"));set("earfcn",snap.get("earfcn"));
        set("dlwidth",snap.get("dlbandwidth"));set("ulwidth",snap.get("ulbandwidth"));
        set("users",snap.get("CurrentWifiUser"));
        set("mode",modeCode(snap.get("NetworkType","CurrentNetworkType")));
        set("down",prettyRate(snap.get("CurrentDownloadRate")));
        set("up",prettyRate(snap.get("CurrentUploadRate")));
        if(graph!=null)graph.push(snap.get("rsrp"),snap.get("sinr"));
    }
    private void cellular(){
        LinearLayout bands=box(body,"LTE band control","Choose bands allowed by the router. B7 (2600 MHz) is selected by default.");
        for(int b:RouterClient.LTE_BANDS){
            CheckBox cb=new CheckBox(this);cb.setText("Band B"+b+(b==7?"  ·  2600 MHz":""));
            cb.setTextColor(TEXT);cb.setButtonTintList(ColorStateList.valueOf(AQUA));
            cb.setChecked(selectedBands.contains(b));bands.addView(cb);
            cb.setOnCheckedChangeListener((v,checked)->{if(checked)selectedBands.add(b);else selectedBands.remove(b);});
        }
        button(bands,"Apply selected LTE bands",true,()->confirm("Change LTE bands?",
            "Changing bands can disconnect the router. Keep your router's web interface available as a recovery option.",
            ()->run("Applying LTE bands…",()->{router.lockBands(selectedBands);return "Bands applied";},this::showResult)));
        button(bands,"Restore automatic band selection",false,()->confirm("Restore LTE auto?",
            "Return to automatic cellular band selection?",()->run("Restoring LTE auto…",()->{router.resetBandAuto();return "Automatic LTE selected";},this::showResult)));
        LinearLayout cell=box(body,"Advanced cell lock","Firmware-dependent · lock a specific LTE EARFCN and PCI, if supported.");
        EditText frequency=field(cell,"LTE EARFCN (channel number)","",false);
        EditText pci=field(cell,"PCI (0–503)","",false);
        button(cell,"Check cell lock API support",false,()->readMultiple("Cell lock API",
            new String[]{"net/lock-cell","net/net-mode-list"}));
        button(cell,"Lock EARFCN + PCI",false,()->confirm("Lock this cell?",
            "May cause complete loss of cellular signal. Recovery may require router reset or local web access.",
            ()->run("Requesting cell lock…",()->{
                router.lockCell(Long.parseLong(frequency.getText().toString().trim()),
                    Integer.parseInt(pci.getText().toString().trim()));return "Cell lock accepted by router";
            },this::showResult)));
        button(cell,"Release cell lock",false,()->confirm("Release cell lock?",
            "Return to automatic cell selection, if this API is implemented.",
            ()->run("Releasing cell lock…",()->{router.releaseCell();return "Cell unlock request accepted";},this::showResult)));
        note(cell,"Cell locking cannot create new towers; only supported frequencies/PCIs may be selected. Huawei firmware may reject this endpoint.",AMBER);
        LinearLayout freq=box(body,"Network capabilities","Read your firmware's supported modes and current LTE settings.");
        button(freq,"Read current network mode",false,()->readMultiple("LTE network",
            new String[]{"net/net-mode","net/net-mode-list","net/current-plmn"}));
    }
    private void wifi(){
        LinearLayout card=box(body,"2.4 GHz & 5 GHz Wi-Fi","Inspect SSIDs, channels, security settings and router radio capabilities.");
        button(card,"Read both Wi-Fi radio settings",true,()->readMultiple("Wi-Fi radios",
            new String[]{"wlan/basic-settings","wlan/multi-basic-settings","wlan/wifi-feature-switch","wlan/multi-security-settings"}));
        button(card,"Inspect Wi-Fi channel and width",false,()->readMultiple("Wi-Fi channels",
            new String[]{"wlan/wlan-debug","wlan/channel","wlan/wlan-settings"}));
        note(card,"Wi-Fi 2.4 GHz and 5 GHz are separate from LTE. Wi-Fi channel width changes require confirmation of the exact API schema returned by your firmware.",AMBER);
        LinearLayout guard=box(body,"Unsupported settings safety","Avoid writing guessed fields to the wrong radio.");
        note(guard,"Channel/width and per-device rate limits stay read-only until the firmware provides a verified write schema. Read failures show the actual Huawei error instead of fake success.",SUB);
    }
    private void clients(){
        LinearLayout c=box(body,"Connected devices","Discover users on both Wi-Fi radios; availability depends on firmware.");
        button(c,"Read Wi-Fi client list",true,()->readMultiple("Connected clients",
            new String[]{"wlan/host-list","monitoring/converged-status","security/host-info"}));
        LinearLayout c2=box(body,"Bandwidth and QoS","Router-specific; operator LTE bandwidth cannot be forced.");
        button(c2,"Inspect QoS and traffic-control APIs",false,()->readMultiple("QoS discovery",
            new String[]{"qos/qos-enable","qos/qos-list","security/host-info"}));
        note(c2,"Per-client throttling is not enabled until we verify that this B636-336 firmware exposes a safe write endpoint.",AMBER);
    }
    private void tools(){
        LinearLayout c=box(body,"Router tools","Read system information or send confirmed management actions.");
        button(c,"System information & WAN status",false,()->readMultiple("Router information",
            new String[]{"device/information","monitoring/status","net/current-plmn"}));
        button(c,"System logs (read only)",false,()->readMultiple("Router logs",new String[]{"log/loginfo"}));
        button(c,"Enable mobile data",false,()->confirm("Enable mobile data?","Enable the router's cellular data switch?",
            ()->run("Enabling data…",()->{router.mobileData(true);return "Data enabled";},this::showResult)));
        button(c,"Disable mobile data",false,()->confirm("Disable mobile data?","This will interrupt Internet access for everyone.",
            ()->run("Disabling data…",()->{router.mobileData(false);return "Data disabled";},this::showResult)));
        button(c,"Restart router",false,()->confirm("Restart router?","All users will disconnect temporarily.",
            ()->run("Reboot command…",()->{router.reboot();return "Router reboot accepted";},this::showResult)));
        LinearLayout docs=box(body,"API availability inspector","Check the firmware's real responses without sending settings changes.");
        button(docs,"Check advanced capabilities",false,()->readMultiple("Advanced API support",
            new String[]{"device/seccellinfo","net/cell-info","device/nbrcellinfo",
                "wlan/wlan-debug","net/lock-cell","dialup/mobile-dataswitch"}));
    }
    private void showResult(String r){popup("Router confirmed",r);}
    private void readMultiple(String name,String[] endpoints){
        run("Inspecting "+name+"…",()->{
            StringBuilder s=new StringBuilder("Read-only Huawei API diagnostics\n");
            for(String ep:endpoints){
                s.append("\n").append(ep).append("\n");
                try{
                    Map<String,String> reply=router.readFeature(ep);
                    if(reply.isEmpty())s.append("No fields returned");
                    for(Map.Entry<String,String> item:reply.entrySet()){
                        if(item.getKey().matches("(?i).*password.*|.*token.*|.*SesInfo.*|.*IMEI.*|.*IMSI.*|.*ICCID.*|.*key.*"))continue;
                        s.append(item.getKey()).append(": ").append(item.getValue()).append("\n");
                        if(s.length()>18000){s.append("Output shortened for readability\n");break;}
                    }
                }catch(Exception e){s.append("Unsupported/rejected: ").append(brief(e)).append("\n");}
            }
            return s.toString();
        },result->popup(name,result));
    }
    private void login(){
        LinearLayout login=box(body,"Router sign-in","Huawei Manager type-4 authentication · credentials held in memory only");
        EditText ip=field(login,"Local router IP","192.168.1.1",false);
        button(login,"Diagnose VPN / Wi-Fi routes (no password)",false,()->{
            String address=ip.getText().toString();
            run("Testing phone network routes…",()->new NetworkProbe(this).run(address),
                diagnostics->popup("Connection paths",diagnostics));
        });
        note(login,"Diagnose first. Compare the default Android route against explicit Wi-Fi and see whether port 80 is open. No password is sent.",SUB);
        note(login,"Connection path for login",SUB);
        Spinner selectedRoute=new Spinner(this);
        selectedRoute.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,
            new String[]{"Android default network","Physical Wi-Fi (non-VPN only)"}));
        login.addView(selectedRoute,new LinearLayout.LayoutParams(-1,dp(48)));
        // Prefer physical Wi-Fi when the OS exposes one; never auto-select VPN overlay.
        if(new NetworkProbe(this).wifi()!=null)selectedRoute.setSelection(1);
        EditText user=field(login,"Username","admin",false);
        EditText pass=field(login,"Admin password","",true);
        button(login,"Connect & start real-time monitoring",true,()->{
            String address=ip.getText().toString(),u=user.getText().toString(),password=pass.getText().toString();
            final int routeIndex=selectedRoute.getSelectedItemPosition();
            run("Connecting to Huawei…",()->{
                android.net.Network route=null;
                if(routeIndex==1){
                    route=new NetworkProbe(this).wifi();
                    if(route==null)throw new java.io.IOException("No physical non-VPN Wi-Fi network available to the app. Run the password-free route diagnosis. Do not retry login.");
                }
                RouterClient next=new RouterClient(address,route);
                next.login(u,password);return next;
            },next->{
                router.close();router=next;pass.setText("");
                setStatus("Connected · "+next.address(),true);
                Toast.makeText(this,"Huawei login accepted",Toast.LENGTH_SHORT).show();
                show("Live");
            });
        });
        button(login,"Test Huawei session without password",false,()->{
            int routeIndex=selectedRoute.getSelectedItemPosition();
            run("Checking session API…",()->{
                android.net.Network route=routeIndex==1?new NetworkProbe(this).wifi():null;
                if(routeIndex==1&&route==null)throw new java.io.IOException("Physical non-VPN Wi-Fi is not available to the app. Run route diagnosis.");
                return new RouterClient(ip.getText().toString(),route).sessionDiagnostics();
            },
                res->{
                    StringBuilder display=new StringBuilder();
                    for(Map.Entry<String,String> item:res.entrySet())
                        display.append(item.getKey()).append(":\n").append(item.getValue()).append("\n\n");
                    popup("Connection test",display.toString());
                });
        });
        note(login,"If the test finds only a Wi-Fi + VPN overlay, use the VPN settings to allow this new app to access the local network. The app will not silently route the password through the VPN.",AMBER);
        LinearLayout about=box(body,"Privacy & safety","Local-only access to your router");
        note(about,"Your password is never saved to a file, sent to GitHub or placed in app logs. Commands are confirmed before execution.",SUB);
    }
}
