async page => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/media/hero/**/frame_069.webp", route => route.fulfill({ status: 404, body: "" }));
  try {
    await page.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
    await page.locator('label[for="construction-chapter-1"]').click();
    await page.getByRole("status").filter({ hasText: "Imagem indisponível" }).waitFor();
    if (!await page.locator("#construction-panel-1 h2").isVisible()) throw new Error("Failed image hid the service");
    await page.getByRole("button", { name: "Próxima etapa", exact: true }).click();
    await page.locator("#construction-panel-2 img").evaluate(image => image.decode());
    if (!await page.locator("#construction-chapter-2").isChecked()) throw new Error("Failed image blocked navigation");
    return { imageFailure: "service remains readable; navigation recovers to the next original image" };
  } finally { await page.unroute("**/media/hero/**/frame_069.webp"); }
}
