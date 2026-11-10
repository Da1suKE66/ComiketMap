import { expect, type Page } from "@playwright/test";
import { demoData } from "../lib/demo";

// The app starts empty. Install demonstration records only in isolated tests.
export async function openDemo(page: Page) {
  await page.goto("/");
  await expect(page.locator(".loading-state")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "添加摊位", exact: true })).toBeEnabled();
  if (await page.getByText("示例数据", { exact: true }).count()) return;
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({ name: "fixture.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(demoData())) });
  await page.getByRole("button", { name: "确认替换并导入", exact: true }).click();
  await expect(page.getByText("示例数据", { exact: true })).toBeVisible();
}
