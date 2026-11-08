import { test, expect, type Page } from "@playwright/test";
import { demoData } from "../lib/demo";

// Replace only the native OS pickers/permission prompts. All reads, writes and
// persisted handles below use Chromium's real File System API and IndexedDB.
async function installPickers(page: Page) {
  await page.addInitScript(() => {
    const target = () => sessionStorage.getItem("test-file-name") || "ComiPath-C109.json";
    const permission = async () => sessionStorage.getItem("test-file-denied") === "true" ? "denied" : "granted";
    Object.defineProperty(FileSystemHandle.prototype, "queryPermission", { configurable: true, value: permission });
    Object.defineProperty(FileSystemHandle.prototype, "requestPermission", { configurable: true, value: permission });
    Object.defineProperty(window, "showSaveFilePicker", { configurable: true, value: async (options: { suggestedName: string }) => {
      if (sessionStorage.getItem("test-cancel-picker") === "true") throw new DOMException("Cancelled", "AbortError");
      sessionStorage.setItem("test-suggested-name", options.suggestedName);
      return (await navigator.storage.getDirectory()).getFileHandle(target(), { create: true });
    } });
    Object.defineProperty(window, "showOpenFilePicker", { configurable: true, value: async () => [await (await navigator.storage.getDirectory()).getFileHandle(target())] });
  });
}
async function start(page: Page) { await installPickers(page); await page.goto("/"); await expect(page.getByText("先逛逛示例手帐", { exact: true })).toBeVisible(); }
async function fileData(page: Page, name = "ComiPath-C109.json") {
  return page.evaluate(async name => JSON.parse(await (await (await navigator.storage.getDirectory()).getFileHandle(name)).getFile().then(f => f.text())), name);
}
async function seedFile(page: Page, name: string, text: string) {
  await page.evaluate(async ({ name, text }) => { const h = await (await navigator.storage.getDirectory()).getFileHandle(name, { create: true }); const s = await h.createWritable(); await s.write(text); await s.close(); sessionStorage.setItem("test-file-name", name); }, { name, text });
}
test("chosen file receives complete data and later edits; persisted handle reloads even without the browser data cache", async ({ page }) => {
  await start(page); await page.getByRole("button", { name: "选择保存文件", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("test-suggested-name"))).toBe("ComiPath-C109.json");
  const initial = await fileData(page); expect(initial.booths).toHaveLength(12); expect(initial.booths[0].images[0].src).toBe("/demo-menu.svg"); expect(initial.booths[0].items[0].orders).toHaveLength(2);
  await page.locator(".booth-card-main").filter({ hasText: "雨の日レコード" }).click(); await page.getByRole("button", { name: "编辑摊位", exact: true }).click(); await page.getByRole("button", { name: /品书图片/ }).click();
  await page.getByRole("dialog", { name: "编辑摊位" }).locator('input[type="file"]').setInputFiles({ name: "menu.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a84sAAAAASUVORK5CYII=", "base64") });
  await expect(page.locator(".image-tile")).toHaveCount(2); await page.getByRole("button", { name: "保存摊位", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible(); expect((await fileData(page)).booths[0].images[1].src).toMatch(/^data:image\/jpeg/); await page.getByRole("button", { name: "关闭窗口", exact: true }).click();
  await page.getByRole("button", { name: "购买清单", exact: true }).click(); const a = page.locator("tbody tr").filter({ hasText: "雨のあとで" }).filter({ has: page.getByText("A", { exact: true }) }); await a.getByRole("button", { name: /记为购齐/ }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible();
  expect((await fileData(page)).booths[0].items[0].orders.map((o: { purchased: number }) => o.purchased)).toEqual([1, 0]);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open("comipath-c109", 1); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>(resolve => { const tx = db.transaction("notebook", "readwrite"); tx.objectStore("notebook").delete("data"); tx.oncomplete = () => { db.close(); resolve(); }; });
  });
  await page.reload(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible(); await page.getByRole("button", { name: "购买清单", exact: true }).click(); await expect(a.getByRole("spinbutton")).toHaveValue("1");
});
test("opening an existing file previews before replacing and then writes future changes back to that file", async ({ page }) => {
  await start(page); const other = demoData(); other.booths[0].circle = "磁盘上的社团";
  await seedFile(page, "existing.json", JSON.stringify(other)); await page.getByRole("button", { name: "打开已有手帐", exact: true }).click(); await expect(page.getByRole("dialog", { name: "打开本地手帐？" })).toContainText("existing.json");
  await expect(page.locator(".booth-card").filter({ hasText: "磁盘上的社团" })).toHaveCount(0); await page.getByRole("button", { name: "确认打开并绑定", exact: true }).click(); await expect(page.locator(".booth-card").filter({ hasText: "磁盘上的社团" })).toHaveCount(1); await expect(page.getByText("已写回 existing.json", { exact: true })).toBeVisible();
  await page.locator(".booth-card-main").filter({ hasText: "磁盘上的社团" }).click(); await page.getByRole("button", { name: "全部记为已购", exact: true }).click(); await expect(page.getByText("已写回 existing.json", { exact: true })).toBeVisible(); expect((await fileData(page, "existing.json")).booths[0].items[0].selfPurchased).toBe(1);
});
test("permission revocation never reports success and explicit retry writes recovered changes", async ({ page }) => {
  await start(page); await page.getByRole("button", { name: "选择保存文件", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible(); await page.evaluate(() => sessionStorage.setItem("test-file-denied", "true"));
  await page.getByRole("button", { name: "购买清单", exact: true }).click(); const a = page.locator("tbody tr").filter({ hasText: "雨のあとで" }).filter({ has: page.getByText("A", { exact: true }) }); await a.getByRole("button", { name: /记为购齐/ }).click(); await expect(page.getByText("尚未保存到文件", { exact: true })).toBeVisible(); expect((await fileData(page)).booths[0].items[0].orders[0].purchased).toBe(0);
  await page.evaluate(() => sessionStorage.removeItem("test-file-denied")); await page.getByRole("button", { name: "手帐文件", exact: true }).click();
  await page.getByRole("button", { name: "重试保存", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible(); expect((await fileData(page)).booths[0].items[0].orders[0].purchased).toBe(1);
  await page.getByRole("button", { name: "知道了", exact: true }).click();
  // Save As preserves allocations while changing the file used for future edits.
  await page.getByRole("button", { name: "手帐文件", exact: true }).click(); await page.evaluate(() => sessionStorage.setItem("test-file-name", "recovered.json")); await page.getByRole("button", { name: "另存为…", exact: true }).click(); await expect(page.getByText("已写回 recovered.json", { exact: true })).toBeVisible(); expect((await fileData(page, "recovered.json")).booths[0].items[0].orders[0].purchased).toBe(1);
});
test("an external file modification is detected and never overwritten automatically", async ({ page }) => {
  await start(page); await page.getByRole("button", { name: "选择保存文件", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible();
  const external = demoData(); external.booths[0].circle = "外部编辑的社团，不得覆盖"; await seedFile(page, "ComiPath-C109.json", JSON.stringify(external));
  await page.getByRole("button", { name: "立即保存", exact: true }).click(); await expect(page.locator(".local-file-bar")).toContainText("目标文件已被其他程序"); expect((await fileData(page)).booths[0].circle).toBe("外部编辑的社团，不得覆盖");
});
test("refresh with expired permission requires reconnecting without changing the file", async ({ page }) => {
  await start(page); await page.getByRole("button", { name: "选择保存文件", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible(); const before = await fileData(page);
  await page.evaluate(() => sessionStorage.setItem("test-file-denied", "true")); await page.reload(); await expect(page.getByText("文件等待授权", { exact: true })).toBeVisible(); expect(await fileData(page)).toEqual(before);
  await page.evaluate(() => sessionStorage.removeItem("test-file-denied")); await page.getByRole("button", { name: "重新授权 / 读取", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible(); expect(await fileData(page)).toEqual(before);
});
test("unsaved recovery data survives a reload and can be saved separately without overwriting the original", async ({ page }) => {
  await start(page); await page.getByRole("button", { name: "选择保存文件", exact: true }).click(); await expect(page.getByText("已写回 ComiPath-C109.json", { exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("test-file-denied", "true")); await page.getByRole("button", { name: "购买清单", exact: true }).click(); const a = page.locator("tbody tr").filter({ hasText: "雨のあとで" }).filter({ has: page.getByText("A", { exact: true }) }); await a.getByRole("button", { name: /记为购齐/ }).click(); await expect(page.getByText("尚未保存到文件", { exact: true })).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem("test-file-denied")); page.on("dialog", d => d.accept()); await page.reload(); await expect(page.locator(".local-file-bar")).toContainText("较新的未写回修改"); await page.getByRole("button", { name: "购买清单", exact: true }).click(); await expect(a.getByRole("spinbutton")).toHaveValue("1");
  expect((await fileData(page)).booths[0].items[0].orders[0].purchased).toBe(0); await page.evaluate(() => sessionStorage.setItem("test-file-name", "rescue.json")); await page.getByRole("button", { name: "另存为新文件", exact: true }).click(); await expect(page.getByText("已写回 rescue.json", { exact: true })).toBeVisible(); expect((await fileData(page, "rescue.json")).booths[0].items[0].orders[0].purchased).toBe(1);
});
test("invalid local JSON is rejected without modifying either the target file or current notebook", async ({ page }) => {
  await start(page); await seedFile(page, "invalid.json", '{"version":999}'); await page.getByRole("button", { name: "打开已有手帐", exact: true }).click(); await expect(page.getByRole("status")).toContainText("校验失败"); await expect(page.locator(".booth-card")).toHaveCount(6); expect(await fileData(page, "invalid.json")).toEqual({ version: 999 });
});
test("cancelled save picker and unsupported browsers preserve existing data", async ({ page }) => {
  await start(page); await page.evaluate(() => sessionStorage.setItem("test-cancel-picker", "true")); await page.getByRole("button", { name: "选择保存文件", exact: true }).click(); await expect(page.getByText("已缓存 · 未绑定文件", { exact: true })).toBeVisible(); await expect(page.getByText("尚未保存到文件", { exact: true })).toHaveCount(0);
  await page.addInitScript(() => { Object.defineProperty(window, "showSaveFilePicker", { configurable: true, value: undefined }); }); await page.reload(); await expect(page.locator(".local-file-bar")).toContainText("当前浏览器不支持"); await expect(page.getByRole("button", { name: "选择保存文件", exact: true })).toBeDisabled(); await expect(page.locator(".booth-card")).toHaveCount(6);
});
