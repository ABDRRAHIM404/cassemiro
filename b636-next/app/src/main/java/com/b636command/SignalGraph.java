package com.b636command;
import android.content.Context;
import android.graphics.*;
import android.view.View;
import java.util.*;

/**
 * Two independently-scaled histories.
 * Left axis: RSRP dBm [-120, -60].
 * Right axis: SINR dB [-15, +30].
 * No synthetic/interpolated samples.
 */
final class SignalGraph extends View {
    private final ArrayDeque<Float> rsrp=new ArrayDeque<>(),sinr=new ArrayDeque<>();
    private final Paint p=new Paint(3);
    private static final int GREEN=0xFF45D9CE,GOLD=0xFFFFC97E,SUB=0xFFA6C1CF;
    SignalGraph(Context c){super(c);setMinimumHeight(dp(205));}
    private int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+0.5f);}
    void push(String a,String b){
        Float x=parse(a),y=parse(b);
        if(x==null&&y==null)return;
        if(rsrp.size()>=60){rsrp.removeFirst();sinr.removeFirst();}
        rsrp.addLast(x==null?Float.NaN:x);
        sinr.addLast(y==null?Float.NaN:y);
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
        float w=getWidth(),h=getHeight(),left=dp(44),top=dp(30),bottom=h-dp(38),right=w-dp(37);
        p.setStyle(Paint.Style.FILL);p.setColor(0xFF112A3B);
        canvas.drawRoundRect(0,0,w,h,dp(14),dp(14),p);
        p.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));
        p.setTextSize(dp(10));
        p.setColor(GREEN);
        canvas.drawText("RSRP dBm",dp(9),dp(18),p);
        p.setColor(GOLD);
        p.setTextAlign(Paint.Align.RIGHT);
        canvas.drawText("SINR dB",w-dp(8),dp(18),p);
        p.setTextAlign(Paint.Align.LEFT);
        for(int i=0;i<=4;i++){
            float y=top+(bottom-top)*i/4f;
            p.setColor(0xFF284558);p.setStrokeWidth(dp(1));
            canvas.drawLine(left,y,right,y,p);
            p.setColor(GREEN);
            canvas.drawText(""+(-60-i*15),dp(5),y+dp(3),p);
            p.setColor(GOLD);
            p.setTextAlign(Paint.Align.RIGHT);
            canvas.drawText(""+(30-i*11.25f),w-dp(6),y+dp(3),p);
            p.setTextAlign(Paint.Align.LEFT);
        }
        if(rsrp.size()<2){
            p.setColor(SUB);p.setTextSize(dp(12));
            canvas.drawText("Graph starts after 2 real samples",left,top+dp(38),p);
        }else{
            plot(canvas,rsrp,GREEN,-120,-60,left,top,right,bottom);
            plot(canvas,sinr,GOLD,-15,30,left,top,right,bottom);
        }
        p.setColor(SUB);p.setTextSize(dp(10));
        canvas.drawText("Most recent samples →",left,bottom+dp(20),p);
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
