"use client";

import React, { useState } from "react";
import {
  formatarMoeda,
  formatarNumeroEditavel,
  formatarPercentual,
  parseNumeroFlexivel,
} from "@/lib/locacao/financeiro";

type FormattedNumberInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  format: "currency" | "percentage" | "number";
  decimals?: number;
};

export function FormattedNumberInput({
  value,
  onValueChange,
  format,
  decimals = 2,
  className = "",
  onBlur,
  onFocus,
  ...props
}: FormattedNumberInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={focused ? value : formatDisplay(value, format)}
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        const parsed = parseNumeroFlexivel(value);
        const normalized = parsed === null ? "" : formatarNumeroEditavel(parsed, decimals);
        onValueChange(normalized);
        onBlur?.(event);
      }}
      className={className}
    />
  );
}

function formatDisplay(value: string, format: FormattedNumberInputProps["format"]) {
  const parsed = parseNumeroFlexivel(value);
  if (parsed === null) return "";
  if (format === "currency") return formatarMoeda(parsed);
  if (format === "percentage") return formatarPercentual(parsed);
  return formatarNumeroEditavel(parsed);
}
