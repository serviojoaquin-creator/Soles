"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { authInputClass } from "@/components/ui/auth-card";

type PasswordInputProps = {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
};

export function PasswordInput({
  name,
  label,
  autoComplete,
  placeholder,
  disabled = false,
  minLength,
  maxLength = 72,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const visibilityLabel = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <span className="relative mt-2 block">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          className={`${authInputClass} mt-0 pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visibilityLabel}
          title={visibilityLabel}
          className="text-muted hover:text-foreground focus-visible:ring-accent absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {visible ? (
            <EyeOff aria-hidden="true" size={20} />
          ) : (
            <Eye aria-hidden="true" size={20} />
          )}
        </button>
      </span>
    </div>
  );
}
