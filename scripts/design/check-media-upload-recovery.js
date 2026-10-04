async page => {
  // Operator supplies an isolated existing-user session in the parent context.
  // All browser Supabase writes and local Server Actions are intercepted/blocked.
  const origin = "http://127.0.0.1:3001";
  const cookies = await page.context().cookies(origin);
  if (!cookies.some(cookie => cookie.name.startsWith("sb-"))) throw new Error("Isolated admin session required");
  const results = [];
  for (const mode of ["insert-response-lost", "registration-retry", "storage-response-lost"]) {
    const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies(cookies);
    try {
      const p = await context.newPage();
      let uploads = 0;
      let inserts = 0;
      let infoReads = 0;
      let savedRecord = null;
      let objectPath = null;
      let fileSize = 0;
      const blocked = [];
      const errors = [];
      p.on("pageerror", error => errors.push(error.message));
      await p.route("http://127.0.0.1:3001/**", async route => {
        if (route.request().method() !== "GET") {
          blocked.push("local-server-action");
          return route.abort();
        }
        return route.continue();
      });
      const json = (route, status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
      await p.route("https://zjjepitczgffszbilfte.supabase.co/**", async route => {
        const request = route.request();
        const url = new URL(request.url());
        const method = request.method();
        if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
        if (method === "POST" && url.pathname.startsWith("/storage/v1/object/project-media-private/")) {
          uploads++;
          objectPath = decodeURIComponent(url.pathname.split("/project-media-private/")[1]);
          if (mode === "storage-response-lost") return json(route, 503, { message: "Synthetic lost acknowledgement" });
          return json(route, 200, { Key: `project-media-private/${objectPath}`, Id: "00000000-0000-4000-8000-000000000077" });
        }
        if (method === "GET" && url.pathname.startsWith("/storage/v1/object/info/project-media-private/")) {
          infoReads++;
          return json(route, 200, { size: fileSize, name: objectPath, content_type: "image/png" });
        }
        if (method === "POST" && url.pathname === "/rest/v1/project_media") {
          inserts++;
          const record = request.postDataJSON();
          if (record.storage_path !== objectPath) throw new Error("Upload and record identities differ");
          if (mode === "insert-response-lost") {
            savedRecord = record;
            return json(route, 503, { code: "MOCK", message: "Synthetic lost insert response" });
          }
          if (mode === "registration-retry" && inserts === 1) return json(route, 503, { code: "MOCK", message: "Synthetic temporary insert failure" });
          savedRecord = record;
          return json(route, 201, null);
        }
        if (method === "GET" && url.pathname === "/rest/v1/project_media" && url.searchParams.has("id")) {
          return json(route, 200, savedRecord ? [savedRecord] : []);
        }
        if (method !== "GET") {
          blocked.push(`${method}:${url.pathname}`);
          return route.abort();
        }
        return route.continue();
      });
      await p.goto(`${origin}/admin/projetos`, { waitUntil: "load" });
      const edit = p.locator('a[href^="/admin/projetos/"]').filter({ hasText: "Editar" }).first();
      const href = await edit.getAttribute("href");
      if (!href || href.endsWith("/novo")) throw new Error("Existing project edit link required");
      await p.goto(origin + href, { waitUntil: "load" });
      const gallery = p.locator(".project-media");
      // A tiny synthetic image exists only in browser memory; never sent remotely.
      const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZVQAAAAASUVORK5CYII=", "base64");
      fileSize = buffer.length;
      await gallery.locator('input[type="file"]').setInputFiles({ name: "local-recovery-fixture.png", mimeType: "image/png", buffer });
      await gallery.getByPlaceholder("Descreva o que aparece na fotografia").fill("Ilustração sintética usada somente no teste local");
      await gallery.getByRole("button", { name: "Enviar arquivos", exact: true }).click();
      if (mode === "registration-retry") {
        await gallery.getByRole("alert").waitFor();
        await gallery.getByRole("button", { name: "Tentar novamente", exact: true }).click();
      }
      await gallery.getByRole("status").filter({ hasText: "com sucesso" }).waitFor();
      if (uploads !== 1 || inserts !== (mode === "registration-retry" ? 2 : 1) || !savedRecord || blocked.length || errors.length) {
        throw new Error(JSON.stringify({ mode, uploads, inserts, blocked, errors }));
      }
      if (mode === "storage-response-lost" && infoReads !== 1) throw new Error("Storage metadata reconciliation missing");
      results.push({ mode, uploads, inserts, infoReads, realProjectWrites: 0, unexpectedWrites: blocked, pageErrors: errors });
    } finally { await context.close(); }
  }
  return { results, scope: "actual signed-in gallery and SDK, intercepted writes; not a real Storage/database lifecycle test" };
}
