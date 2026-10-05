import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

test("actual Gmail/Resend transports use only the business inbox and complete escaped Brazilian quote details", async () => {
  const key=Symbol.for("cassemiro.quote-notification-test");
  const state={options:null,message:null,accepted:["cassemiro.obras@gmail.com"],closed:0,resendOptions:null};globalThis[key]=state;
  const mocks={
    nodemailer:`const s=globalThis[Symbol.for("cassemiro.quote-notification-test")];export default {createTransport:options=>{s.options=options;return {sendMail:async message=>{s.message=message;return {accepted:s.accepted}},close:()=>s.closed++}}};`,
    resend:`const s=globalThis[Symbol.for("cassemiro.quote-notification-test")];export class Resend {emails={send:async(message,options)=>{s.message=message;s.resendOptions=options;return {error:null}}};}`
  };
  const hooks=registerHooks({resolve(specifier,context,nextResolve){
    if(mocks[specifier])return {url:`data:text/javascript,${encodeURIComponent(mocks[specifier])}`,shortCircuit:true};
    if(["./notification-config","./notification-message"].includes(specifier))return nextResolve(new URL(`${specifier}.ts`,context.parentURL).href,context);
    return nextResolve(specifier,context);
  }});
  const keys=["GMAIL_APP_PASSWORD","RESEND_API_KEY","RESEND_FROM_EMAIL","QUOTE_NOTIFICATION_EMAIL"];
  const old=keys.map(key=>process.env[key]);const oldFetch=globalThis.fetch;
  try{
    globalThis.fetch=()=>{throw new Error("Network forbidden in mail regression")};
    const {sendQuoteNotification}=await import("../src/lib/quotes/send-notification.ts");
    const {quoteNotificationsConfigured}=await import("../src/lib/quotes/notification-config.ts");
    const quote={name:'Maria <script>alert("x")</script>',phone:"(15) 99999-1111",city:"Sorocaba",workType:"Construção comercial",description:"Obra de loja & escritório.\nSegunda linha",desiredStart:"2026-11-05"};
    const saved={id:"synthetic-quote",created_at:"2026-10-05T14:20:30Z"};
    for(const key of keys)delete process.env[key];
    assert.equal(quoteNotificationsConfigured(),false);
    assert.ok((await sendQuoteNotification(quote,saved)).error);
    assert.equal(state.message,null);
    process.env.GMAIL_APP_PASSWORD="abcd efgh ijkl mnop";
    process.env.QUOTE_NOTIFICATION_EMAIL="wrong-recipient@example.invalid";
    assert.equal(quoteNotificationsConfigured(),true);
    assert.deepEqual(await sendQuoteNotification(quote,saved),{});
    assert.equal(state.options.host,"smtp.gmail.com");assert.equal(state.options.port,465);assert.equal(state.options.secure,true);
    assert.deepEqual(state.options.auth,{user:"Cassemiro.obras@gmail.com",pass:"abcdefghijklmnop"});
    assert.equal(state.options.disableFileAccess,true);assert.equal(state.options.disableUrlAccess,true);
    assert.equal(state.options.debug,false);assert.equal(state.options.logger,false);
    assert.equal(state.message.to,"Cassemiro.obras@gmail.com");assert.equal(state.message.from.address,state.message.to);
    for(const value of [quote.name,quote.phone,quote.city,quote.workType,quote.description,"05/11/2026","05/10/2026","11:20:30"])assert.ok(state.message.text.includes(value),`Missing text field ${value}`);
    assert.ok(!state.message.html.includes("<script>"));assert.ok(state.message.html.includes("&lt;script&gt;"));assert.ok(state.message.html.includes("loja &amp; escritório.<br>Segunda linha"));
    assert.ok(state.message.text.includes("https://cassemiro-one.vercel.app/admin/orcamentos/synthetic-quote"));
    state.accepted=[];assert.ok((await sendQuoteNotification(quote,saved)).error);assert.equal(state.closed,2);
    delete process.env.GMAIL_APP_PASSWORD;process.env.RESEND_API_KEY="synthetic-only";process.env.RESEND_FROM_EMAIL="verified@example.invalid";
    assert.equal(quoteNotificationsConfigured(),true);assert.equal((await sendQuoteNotification({...quote,desiredStart:""},saved)).error,null);
    assert.equal(state.message.to,"Cassemiro.obras@gmail.com");assert.ok(state.message.text.includes("Não informada"));
    assert.deepEqual(state.resendOptions,{idempotencyKey:"quote-notification-synthetic-quote"});
  }finally{
    keys.forEach((key,i)=>{if(old[i]===undefined)delete process.env[key];else process.env[key]=old[i]});
    globalThis.fetch=oldFetch;hooks.deregister();delete globalThis[key];
  }
});
