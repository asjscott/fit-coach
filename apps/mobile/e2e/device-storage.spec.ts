import { expect, test, type Page } from "@playwright/test";

// The Logbook's web storage must work in every browser, survive a reload, and work with the app open in
// two tabs at once. expo-sqlite's web build failed the first in Safari and the last in Chrome
async function readResult(page: Page) {
  const result = page.getByTestId("storage-check");
  await expect(result).toContainText("STORAGE_", { timeout: 30_000 });
  const text = await result.innerText();
  expect(text).toMatch(/^STORAGE_OK /);
  return {
    previous: text.match(/previous=(\S+)/)![1],
    written: text.match(/written=(\S+)/)![1],
  };
}

async function check(page: Page) {
  await page.goto("/storage-check");
  return readResult(page);
}

test("saves and reads back, across a reload and a second tab", async ({ context, page }) => {
  const first = await check(page);
  expect(first.previous).toBe("null");

  // Each load writes, so navigating again here could read the reload's own write instead of the first
  await page.reload();
  const afterReload = await readResult(page);
  expect(afterReload.previous).toBe(first.written);

  const secondTab = await check(await context.newPage());
  expect(secondTab.previous).toBe(afterReload.written);
});
