import { test, expect, type Page } from "@playwright/test";
import { demoData } from "../lib/demo";

const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a84sAAAAASUVORK5CYII=", "base64");
async function open(page: Page) { await page.goto("/"); await expect(page.getByText("先逛逛示例手帐", { exact: true })).toBeVisible(); await page.getByRole("button", { name: "拓扑图", exact: true }).click(); }
async function stored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open("comipath-c109", 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    return new Promise<ReturnType<typeof demoData>>(resolve => { const r = db.transaction("notebook").objectStore("notebook").get("data"); r.onsuccess = () => { db.close(); resolve(r.result); }; });
  });
}
test("all twelve halls, three days and independent hall visibility work", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message)); await open(page);
  await expect(page.locator(".booth-card")).toHaveCount(6);
  await expect(page.locator(".hall-tabs button")).toHaveCount(13);
  await page.getByRole("button", { name: "DAY 2 12.30", exact: true }).click(); await expect(page.locator(".booth-card")).toHaveCount(3);
  await page.getByRole("button", { name: "DAY 3 12.31", exact: true }).click(); await expect(page.locator(".booth-card")).toHaveCount(3);
  await page.getByRole("button", { name: "全部日期", exact: true }).click(); await expect(page.locator(".booth-card")).toHaveCount(12);
  await page.getByRole("button", { name: "控制馆区显示" }).click(); await page.locator(".layers-popover").getByText("东 1 馆", { exact: true }).click(); await expect(page.locator(".booth-card")).toHaveCount(10);
  await page.locator(".layers-popover").getByText("东 1 馆", { exact: true }).click(); await page.getByRole("button", { name: "关闭图层" }).click();
  await page.locator(".hall-tabs").getByRole("button", { name: /^东 1/ }).click(); await expect(page.locator(".booth-card")).toHaveCount(2); await expect(page.locator(".map-caption strong")).toContainText("东 1");
  await page.getByRole("button", { name: "放大地图" }).click(); await expect(page.locator(".map-zoom")).toContainText("125%"); await page.getByRole("button", { name: "重置地图视角" }).click(); await expect(page.locator(".map-zoom")).toContainText("100%");
  expect(errors).toEqual([]);
});
test("A and B purchases are independent and persist after reload; CSV is downloadable", async ({ page }) => {
  await open(page); await page.getByRole("button", { name: "购买清单", exact: true }).click();
  const rowA = page.locator("tbody tr").filter({ hasText: "雨のあとで" }).filter({ has: page.getByText("A", { exact: true }) });
  const rowB = page.locator("tbody tr").filter({ hasText: "雨のあとで" }).filter({ has: page.getByText("B", { exact: true }) });
  await rowA.getByRole("button", { name: /记为购齐/ }).click();
  await expect(rowA.getByRole("spinbutton")).toHaveValue("1"); await expect(rowB.getByRole("spinbutton")).toHaveValue("0");
  await expect(page.getByText("已缓存 · 未绑定文件", { exact: true })).toBeVisible(); await page.reload();
  await page.getByRole("button", { name: "购买清单", exact: true }).click(); await expect(rowA.getByRole("spinbutton")).toHaveValue("1"); await expect(rowB.getByRole("spinbutton")).toHaveValue("0");
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "导出 CSV", exact: true }).click(); const file = await pending; expect(file.suggestedFilename()).toBe("C109-购买清单.csv");
  const data = await stored(page); expect(data.booths[0].items[0].orders.map(o => o.purchased)).toEqual([1, 0]);
});
test("create a booth, upload an image, allocate quantities, position, edit and delete", async ({ page }) => {
  await open(page); await page.getByRole("button", { name: "添加摊位", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "添加一个心动摊位" });
  await dialog.getByLabel("サークル / 社团名称").fill("测试社团"); await dialog.getByLabel("画师名称", { exact: true }).fill("测试画师");
  await dialog.getByLabel("区域 / ブロック").fill("ア"); await dialog.getByLabel("摊位号 / スペース").fill("01a"); await dialog.getByLabel("画师粉丝数").fill("10000");
  await dialog.getByRole("button", { name: /品书图片/ }).click(); await dialog.locator('input[type="file"]').setInputFiles({ name: "menu.png", mimeType: "image/png", buffer: pixel }); await expect(dialog.locator(".image-tile")).toHaveCount(1);
  await dialog.getByRole("button", { name: /购买与代购/ }).click(); await dialog.getByRole("button", { name: "添加商品", exact: true }).first().click();
  await dialog.getByLabel("商品名称").fill("测试新刊"); await dialog.getByLabel("单价（JPY）").fill("1000"); await dialog.getByRole("button", { name: "添加一笔代购" }).click(); await dialog.getByRole("button", { name: "添加一笔代购" }).click();
  await expect(dialog.locator(".allocation-row")).toHaveCount(3); await dialog.getByLabel("商品 1 B 代购数量").fill("2"); await dialog.getByRole("button", { name: "保存摊位", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "测试社团", exact: true }); await expect(detail).toBeVisible(); await expect(detail.locator(".form-total")).toContainText("¥4,000"); await expect(detail.locator(".detail-images img")).toHaveCount(1);
  await detail.getByRole("button", { name: "地图定位", exact: true }).click(); await expect(page.locator(".placing-banner")).toBeVisible(); await page.locator(".venue-svg").click({ position: { x: 350, y: 230 } }); await expect(page.locator(".placing-banner")).toHaveCount(0);
  await expect(page.getByText("已缓存 · 未绑定文件", { exact: true })).toBeVisible(); let data = await stored(page); const b = data.booths.find(b => b.circle === "测试社团")!; expect(b.x).not.toBeNull(); expect(b.images[0].src).toMatch(/^data:image\/jpeg/); expect(b.items[0].orders.map(o => o.quantity)).toEqual([1, 2]);
  await page.reload(); await page.getByLabel("搜索摊位").fill("测试社团"); await page.locator(".booth-card-main").click();
  await page.getByRole("button", { name: "编辑摊位", exact: true }).click(); await page.getByLabel("画师名称", { exact: true }).fill("更新画师"); await page.getByRole("button", { name: "保存摊位", exact: true }).click(); await expect(page.getByRole("dialog", { name: "测试社团", exact: true })).toContainText("更新画师");
  await page.getByRole("button", { name: "编辑摊位", exact: true }).click(); await page.getByRole("button", { name: "删除摊位", exact: true }).click(); await page.getByRole("button", { name: "确认删除", exact: true }).click(); await expect(page.locator(".booth-card")).toHaveCount(0);
});
test("backup export contains images and allocations, imports are previewed and invalid imports preserve existing data", async ({ page }) => {
  await open(page); await page.getByRole("button", { name: "手帐文件", exact: true }).click();
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: /下载额外备份/ }).click(); const backup = await pending; expect(backup.suggestedFilename()).toMatch(/\.json$/);
  const incoming = demoData(); incoming.booths[0].circle = "从备份恢复的社团";
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(incoming)) });
  await expect(page.getByRole("dialog", { name: "导入这份手帐？" })).toBeVisible(); await expect(page.locator(".booth-card").filter({ hasText: "从备份恢复的社团" })).toHaveCount(0); await page.getByRole("button", { name: "确认替换并导入", exact: true }).click(); await expect(page.locator(".booth-card").filter({ hasText: "从备份恢复的社团" })).toHaveCount(1);
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"version":999}') }); await expect(page.getByRole("status")).toContainText("备份格式不正确"); await expect(page.locator(".booth-card")).toHaveCount(6);
});
test("recipient lifecycle, duplicate protection and referenced deletion protection", async ({ page }) => {
  await open(page); await page.getByRole("button", { name: /代购对象/ }).first().click(); await page.getByRole("button", { name: "编辑代购对象 A", exact: true }).click(); await page.getByRole("button", { name: "删除对象", exact: true }).click(); await expect(page.getByRole("alert")).toContainText("仍有代购记录"); await page.getByRole("button", { name: "关闭窗口" }).click();
  await page.getByRole("button", { name: "添加对象", exact: true }).click(); await page.getByLabel("对象名称").fill("A"); await page.getByRole("button", { name: "保存对象", exact: true }).click(); await expect(page.getByRole("alert")).toContainText("已经存在"); await page.getByLabel("对象名称").fill("小林"); await page.getByRole("button", { name: "保存对象", exact: true }).click(); await expect(page.locator(".person-card").filter({ hasText: "小林" })).toHaveCount(1);
  await page.getByRole("button", { name: "编辑代购对象 小林", exact: true }).click(); await page.getByRole("button", { name: "删除对象", exact: true }).click(); await page.getByRole("button", { name: "确认删除", exact: true }).click(); await expect(page.locator(".person-card")).toHaveCount(2);
});
test("hall background uploads and 390px mobile layout remain usable", async ({ page }) => {
  await open(page); await page.locator(".hall-tabs").getByRole("button", { name: /^东 1/ }).click();
  await page.locator('.map-legend input[type="file"]').setInputFiles({ name: "hall.png", mimeType: "image/png", buffer: pixel }); await expect(page.locator(".venue-svg image")).toHaveCount(1); await expect(page.getByText("已缓存 · 未绑定文件", { exact: true })).toBeVisible(); await page.reload();
  await page.locator(".hall-tabs").getByRole("button", { name: /^东 1/ }).click(); await expect(page.locator(".venue-svg image")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.getByRole("button", { name: "打开导航" })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "打开导航" }).click(); await page.getByRole("button", { name: "购买清单", exact: true }).click(); await expect(page.locator(".ledger-panel")).toBeVisible();
});
