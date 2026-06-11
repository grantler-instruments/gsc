import { expect, test } from "@playwright/test";

test("creates a new cue list", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByRole("button", { name: "GO" })).toBeVisible();

  const tablist = page.getByRole("tablist", { name: "Cue lists" });
  await expect(tablist.getByRole("tab", { name: /^Main/ })).toBeVisible();

  await page.getByRole("button", { name: "New cue list" }).click();

  const newTab = tablist.getByRole("tab", { name: /^List 2/ });
  await expect(newTab).toBeVisible();
  await expect(newTab).toHaveAttribute("aria-selected", "true");
  await expect(tablist.getByRole("tab")).toHaveCount(2);
});

test("renames a cue list", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByRole("button", { name: "GO" })).toBeVisible();

  const tablist = page.getByRole("tablist", { name: "Cue lists" });
  await tablist.getByRole("tab", { name: /^Main/ }).dblclick();

  const renameInput = tablist.locator("input");
  await expect(renameInput).toBeVisible();
  await renameInput.fill("Act 1");
  await renameInput.press("Enter");

  await expect(tablist.getByRole("tab", { name: /^Act 1/ })).toBeVisible();
  await expect(tablist.getByRole("tab", { name: /^Main/ })).toHaveCount(0);
});

test("deletes a cue list", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByRole("button", { name: "GO" })).toBeVisible();

  const tablist = page.getByRole("tablist", { name: "Cue lists" });
  await page.getByRole("button", { name: "New cue list" }).click();
  await expect(tablist.getByRole("tab")).toHaveCount(2);

  await tablist.getByRole("button", { name: "Close List 2" }).click();

  await expect(tablist.getByRole("tab")).toHaveCount(1);
  await expect(tablist.getByRole("tab", { name: /^Main/ })).toBeVisible();
  await expect(tablist.getByRole("tab", { name: /^List 2/ })).toHaveCount(0);
});
