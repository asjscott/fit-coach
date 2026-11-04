import { expect, test, type Page } from "@playwright/test";

// The Logbook's web storage must work in every browser, survive a reload, and work with the app open in
// two tabs at once. expo-sqlite's web build failed the first in Safari and the last in Chrome
async function resultOn(page: Page) {
  const result = page.getByTestId("storage-check");
  await expect(result).toContainText("STORAGE_", { timeout: 30_000 });
  const text = await result.innerText();
  expect(text).toMatch(/^STORAGE_OK /);
  return {
    previous: text.match(/previous=(\S+)/)![1],
    written: text.match(/written=(\S+)/)![1],
  };
}

async function open(page: Page) {
  await page.goto("/storage-check");
  return resultOn(page);
}

test("saves and reads back, across a reload and a second tab", async ({ context, page }) => {
  const first = await open(page);
  expect(first.previous).toBe("null");

  // Read the reloaded page itself: every load writes, so navigating again could read this load's write instead
  await page.reload();
  const afterReload = await resultOn(page);
  expect(afterReload.previous).toBe(first.written);

  const secondTab = await open(await context.newPage());
  expect(secondTab.previous).toBe(afterReload.written);
});
