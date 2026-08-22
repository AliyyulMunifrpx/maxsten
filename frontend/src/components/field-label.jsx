// src/components/store/field-label.jsx
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";

// Pesan bawaan browser itu bahasa Inggris & beda-beda tiap browser —
// dipetain manual ke Bahasa Indonesia berdasar jenis constraint yang gagal.
function getErrorMessage(el) {
  const v = el.validity;
  if (v.valueMissing) return "Wajib diisi";
  if (v.typeMismatch)
    return el.type === "email"
      ? "Format email tidak valid"
      : "Format tidak valid";
  if (v.rangeUnderflow) return `Minimal ${el.min}`;
  if (v.rangeOverflow) return `Maksimal ${el.max}`;
  if (v.tooShort) return `Minimal ${el.minLength} karakter`;
  if (v.tooLong) return `Maksimal ${el.maxLength} karakter`;
  if (v.patternMismatch) return "Format tidak sesuai";
  return el.validationMessage || "Isian tidak valid";
}

export default function FieldLabel({ htmlFor, required, children, className }) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!htmlFor) return;
    const el = document.getElementById(htmlFor);
    if (!el) return;

    function handleInvalid(e) {
      e.preventDefault(); // matiin tooltip bawaan browser, kita render sendiri
      setError(getErrorMessage(el));
    }

    function handleFix() {
      if (el.checkValidity()) setError("");
    }

    el.addEventListener("invalid", handleInvalid);
    el.addEventListener("input", handleFix);
    el.addEventListener("change", handleFix);

    return () => {
      el.removeEventListener("invalid", handleInvalid);
      el.removeEventListener("input", handleFix);
      el.removeEventListener("change", handleFix);
    };
  }, [htmlFor]);

  return (
    <div className={`flex flex-col gap-[4px] ${className}`}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1.5 text-white">
        {children}
        {required ? (
          <span
            className="h-1.5 w-1.5 rounded-full bg-red-500"
            title="Wajib diisi"
          />
        ) : (
          <span className="rounded-full bg-white/10 px-1.5 py-1 text-[12px] font-normal border-1 border-white/10 text-white/60">
            Opsional
          </span>
        )}
      </Label>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
