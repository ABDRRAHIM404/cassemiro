async page => {
  const origin = "http://127.0.0.1:3001";
  const results=[];
  for(const [path,label] of [["/admin/configuracoes","Salvar configurações"],["/admin/projetos/054c2c67-a52b-4ef3-97b9-ba506afcd9a1","Salvar projeto"],["/admin/orcamentos/00000000-0000-4000-8000-000000000001","Salvar alteração"],["/admin/redefinir-senha","Guardar nova senha"]]) {
    await page.goto(origin+path);
    if(path === "/admin/redefinir-senha") {
      await page.locator('[name="password"]').fill("Local-UI-Test-Only-2026");
      await page.locator('[name="confirm_password"]').fill("Local-UI-Test-Only-2026");
    }
    let intercepted;
    const received=new Promise(resolve=>{intercepted=resolve;});
    let postCount=0;
    const handler=route=>{if(route.request().method()==="POST"){postCount++;intercepted(route);}else return route.fallback();};
    await page.route(origin+path,handler);
    const button=page.getByRole("button",{name:label,exact:true});
    await button.click();
    const held=await received;
    await page.waitForFunction(()=>document.querySelector('button[aria-busy="true"]')?.disabled === true);
    const pending=page.locator('button[aria-busy="true"]');
    if(!await pending.isDisabled() || postCount !== 1)throw Error("Pending guard failed");
    await page.screenshot({path:`.codex/audits/redesign/current/admin-pending${path.replaceAll("/","-")}.png`});
    results.push({path,pending:true,disabled:true,requests:postCount,scope:"Request held in browser; no backend action executed"});
    await page.evaluate(result=>console.info("CASSEMIRO_PENDING_QA", JSON.stringify(result)),results.at(-1));
    await held.abort("failed");
    await page.unroute(origin+path,handler);
    await page.goto(origin+"/admin");
  }
  return results;
}
