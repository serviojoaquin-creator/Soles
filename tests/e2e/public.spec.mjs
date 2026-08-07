import { expect, test } from "playwright/test";

test.describe("superficie pública", () => {
  test("la landing carga y ofrece los accesos principales", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /El viaje se termina/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Crear mi primer viaje" }),
    ).toHaveAttribute("href", "/register");
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("login, registro y recuperación tienen formularios utilizables", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Qué bueno verte" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeEnabled();
    await expect(page.locator('input[name="password"]')).toBeEnabled();

    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "Creá un lugar para sus viajes" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nombre visible")).toBeEnabled();
    await expect(page.locator('input[name="confirmPassword"]')).toBeEnabled();

    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: "Recuperar acceso" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeEnabled();
  });

  test("una ruta privada redirige al login y bloquea redirects externos", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?error=auth_required$/);

    await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fsteal");
    await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
    await expect(
      page.getByRole("link", { name: "Crear cuenta" }),
    ).toHaveAttribute("href", "/register?next=%2Fdashboard");
  });
});
