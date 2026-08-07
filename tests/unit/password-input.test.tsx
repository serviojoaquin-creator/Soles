import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordInput } from "@/components/ui/password-input";

describe("PasswordInput", () => {
  it("lets the user reveal and hide the password", async () => {
    const user = userEvent.setup();

    render(
      <PasswordInput
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        placeholder="Ingresá tu contraseña"
      />,
    );

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(input).toHaveAttribute("type", "text");

    await user.click(
      screen.getByRole("button", { name: "Ocultar contraseña" }),
    );
    expect(input).toHaveAttribute("type", "password");
  });
});
