async page => {
  const origin = "http://127.0.0.1:3001";
  const results = [];
  for (const width of [1366,390,320]) {
    await page.setViewportSize({width,height:width === 1366 ? 768 : 844});
    await page.goto(origin + "/admin/projetos/novo");
    if (width < 800) {
      const menu = page.locator("header details");
      await menu.locator("summary").focus();
      await page.keyboard.press("Enter");
      if (!await menu.evaluate(el=>el.open)) throw Error("Keyboard menu did not open");
      await page.screenshot({path:`.codex/audits/redesign/current/${width}-admin-menu.png`});
      await page.keyboard.press("Escape");
      if (await menu.evaluate(el=>el.open)) throw Error("Escape did not close menu");
      await menu.locator("summary").click();
      await menu.getByRole("link",{name:"Configurações",exact:true}).click();
      await page.waitForURL("**/admin/configuracoes");
      if (await menu.evaluate(el=>el.open)) throw Error("Menu remained open after navigation");
    } else {
      await page.getByRole("navigation",{name:"Navegação administrativa"}).getByRole("link",{name:"Configurações",exact:true}).click();
      await page.waitForURL("**/admin/configuracoes");
    }
    const active = page.locator('nav a[aria-current="page"]');
    if (await active.first().textContent() !== "Configurações") throw Error("Active navigation missing");
    await page.goto(origin + "/admin/projetos/novo");
    await page.getByRole("button",{name:"Guardar projeto e imagens",exact:true}).click();
    const invalid = await page.evaluate(()=>({name:document.activeElement?.getAttribute("name"), invalid:document.querySelector("form.project-form")?.matches(":invalid")}));
    if (invalid.name !== "title" || !invalid.invalid) throw Error("Required field focus broken");
    for (const name of ["title","summary","content"]) await page.locator(`[name="${name}"]`).fill(name === "title" ? "Projeto apenas para verificar a interface" : "Texto local para verificar validação, sem criar ou publicar qualquer projeto.");
    if (await page.locator('input[name="is_published"]').isChecked()) throw Error("New project should start as draft");
    results.push({width, navigation:true, menuKeyboard:width < 800, invalidFocus:true, draftDefault:true, mutations:"none"});
  }
  for (const width of [1366,390,320]) {
    await page.setViewportSize({width,height:width === 1366 ? 768 : 844});
    for (const [kind,id] of [["active","00000000-0000-4000-8000-000000000001"],["anonymous","00000000-0000-4000-8000-000000000002"]]) {
      const response=await page.goto(`${origin}/admin/orcamentos/${id}`);
      const heading=await page.locator("h1").textContent();
      if (response.status()!==200 || !heading.includes(kind === "active" ? "demonstração" : "anonimizada")) throw Error("Local fixture not rendered through the actual quote page");
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      if(overflow)throw Error("Quote detail overflow");
      if(kind === "anonymous" && await page.locator("main form").count())throw Error("Anonymous contact actions must not be available");
      if(kind === "active" && await page.getByRole("link",{name:"Abrir WhatsApp"}).count() !== 1)throw Error("Quote contact link missing");
      await page.screenshot({path:`.codex/audits/redesign/current/${width}-admin-quote-${kind}.png`,fullPage:true});
      results.push({width,kind,fixture:"local read-only fetch response; no database insertion",overflow});
    }
  }
  return results;
}
