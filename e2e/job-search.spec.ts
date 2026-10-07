import { expect, test } from "@playwright/test";

test("search -> track -> pipeline -> export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();

  const searchInput = page.getByRole("textbox", { name: "Search jobs" });
  await searchInput.fill("frontend");

  await expect(
    page.getByRole("heading", { name: "Junior Frontend Developer" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Track" }).click();

  await expect(
    page.getByRole("heading", { name: "Your job search, in motion." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Junior Frontend Developer" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("jobrain-applications.csv");
});
