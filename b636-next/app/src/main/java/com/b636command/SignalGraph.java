package com.b636command;
import android.content.Context;
import android.graphics.*;
import android.view.View;
import java.util.*;

/** Live signal history. No interpolated or synthetic samples. */
final class SignalGraph extends View {
    private final ArrayDeque<Float> rsrp=new ArrayDeque<>(),sinr=new ArrayDeque<>();
    private final Paint p=new Paint(3);
    SignalGraph(Context c){super(c);setMinimumHeight(dp(190));}
    private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+0.5f);}
    void push(String a,String b){
        Float x=parse(a),y=parse(b);
        if(x==null&&y==null)return;
        if(rsrp.size()>59){rsrp.removeFirst();sinr.removeFirst();}
        rsrp.addLast(x==null?Float.NaN:x);sinr.addLast(y==null?Float.NaN:y);
        invalidate();
    }
    static Float parse(String s){
        if(s==null)return null;
        java.util.regex.Matcher m=java.util.regex.Pattern.compile("-?\\d+(?:\\.\\d+)?").matcher(s);
        if(!m.find())return null;
        try{return Float.parseFloat(m.group());}catch(Exception ex){return null;}
    }
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);
        float w=getWidth(),h=getHeight(),left=dp(39),top=dp(17),bottom=h-dp(30),right=w-dp(12);
        p.setStyle(Paint.Style.FILL);p.setColor(0xFF112A3B);canvas.drawRoundRect(0,0,w,h,dp(14),dp(14),p);
        p.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));p.setTextSize(dp(10));
        for(int i=0;i<=4;i++){
            float y=top+(bottom-top)*i/4f;
            p.setColor(0xFF284558);p.setStrokeWidth(dp(1));canvas.drawLine(left,y,right,y,p);
            p.setColor(0xFF8CAABD);canvas.drawText(""+(-60-i*15),dp(6),y+dp(3),p);
        }
        if(rsrp.size()<2){
            p.setColor(0xFFA6C1CF);p.setTextSize(dp(12));
            canvas.drawText("Signal graph starts after two real samples",left,top+dp(40),p);
            return;
        }
        plot(canvas,rsrp,0xFF45D9CE,-120,-60,left,top,right,bottom);
        plot(canvas,sinr,0xFFFFC97E,-15,30,left,top,right,bottom);
        p.setStyle(Paint.Style.FILL);p.setTextSize(dp(11));
        p.setColor(0xFF45D9CE);canvas.drawText("RSRP (dBm)",left,bottom+dp(19),p);
        p.setColor(0xFFFFC97E);canvas.drawText("SINR (dB)",left+dp(117),bottom+dp(19),p);
    }
    private void plot(Canvas c,ArrayDeque<Float> values,int color,float min,float max,float l,float t,float r,float b){
        Path path=new Path();int i=0;boolean pen=false;int total=values.size();
        for(float value:values){
            float x=l+(r-l)*i/Math.max(1,total-1);i++;
            if(Float.isNaN(value)){pen=false;continue;}
            float yy=b-(Math.max(min,Math.min(max,value))-min)/(max-min)*(b-t);
            if(!pen){path.moveTo(x,yy);pen=true;}else path.lineTo(x,yy);
        }
        p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(dp(2.4f));p.setColor(color);
        c.drawPath(path,p);p.setStyle(Paint.Style.FILL);
    }
}
