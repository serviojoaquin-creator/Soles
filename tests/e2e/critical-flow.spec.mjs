import { Buffer } from "node:buffer";

import { expect, test } from "playwright/test";

const accounts = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL,
    password: process.env.E2E_OWNER_PASSWORD,
  },
  member: {
    email: process.env.E2E_MEMBER_EMAIL,
    password: process.env.E2E_MEMBER_PASSWORD,
  },
  outsider: {
    email: process.env.E2E_OUTSIDER_EMAIL,
    password: process.env.E2E_OUTSIDER_PASSWORD,
  },
};

const hasAccounts = Object.values(accounts).every(({ email, password }) =>
  Boolean(email && password),
);
const mayMutateTestEnvironment = process.env.E2E_ALLOW_MUTATIONS === "1";

async function login(page, account) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function deleteTestTrip(page, tripPath) {
  try {
    await page.goto(`${tripPath}/settings`);

    const reopenButton = page.getByRole("button", { name: "Reabrir viaje" });
    if (await reopenButton.isVisible().catch(() => false)) {
      await page.getByLabel(/Confirmo que quiero reabrir el viaje/i).check();
      await reopenButton.click();
      await page.waitForURL(`${tripPath}/settings?message=trip_reopened`);
    }

    const deleteButton = page.getByRole("button", { name: "Eliminar viaje" });
    if (await deleteButton.isVisible().catch(() => false)) {
      await page
        .getByLabel(/Confirmo que quiero quitar este viaje de Soles/i)
        .check();
      await deleteButton.click();
      await page.waitForURL(/\/dashboard\?message=trip_deleted$/);
    }
  } catch (error) {
    console.warn(
      "[e2e:cleanup] No se pudo borrar lógicamente el viaje de prueba",
      {
        message: error instanceof Error ? error.message : "unknown",
      },
    );
  }
}

test.describe("flujo crítico privado", () => {
  test.skip(
    !hasAccounts || !mayMutateTestEnvironment,
    "Requiere tres cuentas confirmadas y E2E_ALLOW_MUTATIONS=1 en un entorno de pruebas.",
  );

  test("owner, miembro y tercero conservan permisos e integración completa", async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const outsiderContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const memberPage = await memberContext.newPage();
    const outsiderPage = await outsiderContext.newPage();
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const tripName = `Soles E2E ${uniqueSuffix}`;
    const activityTitle = `Atardecer E2E ${uniqueSuffix}`;
    const photoDescription = `Foto E2E ${uniqueSuffix}`;
    const comment = `Comentario E2E ${uniqueSuffix}`;
    const startDate = new Date().toISOString().slice(0, 10);
    let tripPath;

    try {
      await login(ownerPage, accounts.owner);
      await ownerPage.goto("/trips/new");
      await ownerPage.getByLabel("Nombre del viaje").fill(tripName);
      await ownerPage.getByLabel("Destino").fill("Bariloche, Argentina");
      await ownerPage.getByLabel("Salida").fill(startDate);
      await ownerPage.getByLabel("Regreso").fill(startDate);
      await ownerPage.getByRole("button", { name: "Crear viaje" }).click();
      await expect(ownerPage).toHaveURL(
        /\/trips\/[0-9a-f-]+\?message=trip_created$/,
      );
      tripPath = new URL(ownerPage.url()).pathname;

      await ownerPage.goto(`${tripPath}/people`);
      await ownerPage
        .getByLabel(/Email específico/i)
        .fill(accounts.member.email);
      await ownerPage.getByRole("button", { name: "Crear invitación" }).click();
      const inviteInput = ownerPage.locator("#created-invite-url");
      await expect(inviteInput).toBeVisible();
      const inviteUrl = await inviteInput.inputValue();

      await login(memberPage, accounts.member);
      await memberPage.goto(inviteUrl);
      await memberPage
        .getByRole("button", { name: "Sumarme al viaje" })
        .click();
      await expect(memberPage).toHaveURL(
        new RegExp(
          `${tripPath.replaceAll("/", "\\/")}\\?message=invite_accepted$`,
        ),
      );

      await ownerPage.goto(`${tripPath}/itinerary`);
      await login(outsiderPage, accounts.outsider);
      const deniedResponse = await outsiderPage.goto(tripPath);
      expect(deniedResponse?.status()).toBe(404);
      await expect(
        outsiderPage.getByText("404", { exact: true }),
      ).toBeVisible();

      await memberPage.goto(`${tripPath}/itinerary`);
      await memberPage.getByLabel("Actividad").fill(activityTitle);
      await memberPage.getByLabel("Fecha").fill(startDate);
      await memberPage
        .getByRole("button", { name: "Agregar al itinerario" })
        .click();
      await expect(
        memberPage.getByText(activityTitle, { exact: true }),
      ).toBeVisible();
      await expect(
        ownerPage.getByText(activityTitle, { exact: true }),
      ).toBeVisible({
        timeout: 20_000,
      });

      await memberPage.goto(`${tripPath}/album`);
      await memberPage.getByLabel("Elegir foto").setInputFiles({
        name: "soles-e2e.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZK0sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await memberPage.getByLabel(/Descripción/).fill(photoDescription);
      await memberPage.getByRole("button", { name: "Subir foto" }).click();
      await expect(
        memberPage.getByText("La foto se sumó al álbum."),
      ).toBeVisible();
      await expect(
        memberPage.getByText(photoDescription, { exact: true }),
      ).toBeVisible();

      await memberPage
        .getByPlaceholder("Escribí un comentario")
        .first()
        .fill(comment);
      await memberPage
        .getByRole("button", { name: "Publicar" })
        .first()
        .click();
      await expect(
        memberPage.getByText(comment, { exact: true }),
      ).toBeVisible();

      await ownerPage.goto(`${tripPath}/settings`);
      await ownerPage
        .getByLabel(/Confirmo que quiero convertir el viaje en un recuerdo/i)
        .check();
      await ownerPage.getByRole("button", { name: "Finalizar viaje" }).click();
      await expect(ownerPage).toHaveURL(
        new RegExp(
          `${tripPath.replaceAll("/", "\\/")}\/memory\\?message=trip_completed$`,
        ),
      );
      await expect(
        ownerPage.getByText(tripName, { exact: true }),
      ).toBeVisible();
      await expect(
        ownerPage.getByText(activityTitle, { exact: true }),
      ).toBeVisible();
      await expect(
        ownerPage.getByText(photoDescription, { exact: true }),
      ).toBeVisible();
    } finally {
      if (tripPath) await deleteTestTrip(ownerPage, tripPath);
      await Promise.all([
        ownerContext.close(),
        memberContext.close(),
        outsiderContext.close(),
      ]);
    }
  });
});
