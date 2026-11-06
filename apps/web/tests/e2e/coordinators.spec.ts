import { expect, test, type Browser, type Page } from "./support/test";

import { Pool } from "pg";

import { confirmEmail, register, signIn, unique } from "./support/accounts";

const DOMAIN = process.env.E2E_INSTITUTIONAL_DOMAIN ?? "nitap.ac.in";
const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
const clientIp = () =>
  `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

// A real 1x1 PNG: the worker checks magic bytes and re-encodes, so a fake file would be rejected.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** Direct DB access, so this suite needs no pre-seeded admin. */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function member(browser: Browser, role?: "SUPER_ADMIN"): Promise<Page> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "x-forwarded-for": clientIp() },
  });
  const page = await context.newPage();
  const email = unique(DOMAIN);
  await register(page, email);
  await confirmEmail(page, email);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  if (role) {
    await pool.query(
      `insert into user_role (user_id, role_id, granted_by)
       select u.id, role.id, u.id from "user" u, role
        where u.email = $1 and role.name = $2
       on conflict (user_id, role_id) do nothing`,
      [email, role]
    );
  }
  return page;
}

test.afterAll(() => pool.end());

test("an admin publishes a coordinator with a photo, edits and removes them", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const admin = await member(browser, "SUPER_ADMIN");
  const guest = await (
    await browser.newContext({ baseURL: BASE_URL })
  ).newPage();
  const name = `Dr. Coordinator ${Date.now()}`;
  const renamed = `${name} Jr`;
  const email = `${Date.now()}@nitap.ac.in`;

  await admin.goto("/admin/coordinators");
  await admin.waitForLoadState("networkidle");
  const faculty = admin
    .locator("section")
    .filter({ hasText: "Faculty coordinators" });
  await faculty.getByRole("button", { name: "Add" }).click();

  const dialog = admin.getByRole("alertdialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Designation").fill("Assistant Professor, CSE");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel(/choose a photo/i).setInputFiles({
    name: "coordinator.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  // The worker scans asynchronously; Save stays disabled until the upload resolves.
  await expect(dialog.getByText("Photo ready")).toBeVisible({
    timeout: 45_000,
  });
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(admin.getByRole("rowheader", { name })).toBeVisible();

  // Anyone can read it, photo included.
  await guest.goto("/contact");
  await expect(
    guest.getByRole("heading", { name: "Faculty coordinators" })
  ).toBeVisible();
  await expect(guest.getByText(name)).toBeVisible();
  await expect(guest.getByRole("link", { name: email })).toHaveAttribute(
    "href",
    `mailto:${email}`
  );
  const photo = guest.locator("#main img[src*='/api/coordinators/']");
  await expect(photo).toHaveCount(1);
  const photoPath = await photo.getAttribute("src");
  const response = await guest.request.get(photoPath!, { maxRedirects: 0 });
  expect(response.status()).toBe(302);

  const row = admin.getByRole("row").filter({ hasText: name });
  await row.getByRole("button", { name: "Edit" }).click();
  await dialog.getByLabel("Name").fill(renamed);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(admin.getByRole("rowheader", { name: renamed })).toBeVisible();

  await guest.reload();
  await expect(guest.getByText(renamed)).toBeVisible();

  await admin
    .getByRole("row")
    .filter({ hasText: renamed })
    .getByRole("button", { name: "Remove" })
    .click();
  await dialog.getByRole("button", { name: "Remove" }).click();
  await expect(dialog).toBeHidden();
  await expect(admin.getByRole("rowheader", { name: renamed })).toBeHidden();

  await guest.reload();
  await expect(guest.getByText(renamed)).toBeHidden();
});

test("a member without system.configure gets a 404", async ({ browser }) => {
  const page = await member(browser);
  await page.goto("/admin/coordinators");
  await expect(page.getByText("Page not found")).toBeVisible();
});
