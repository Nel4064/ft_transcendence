import type { InputHTMLAttributes } from "react";

type Size = "md" | "lg" | "xl";

// pas de largeur fixe : dans une colonne flex il s'étire, sinon passer className="flex-1"
const base =
  "border border-border rounded-md text-control bg-surface text-text " +
  "placeholder:text-text-light focus:outline-none focus:border-brand " +
  "disabled:opacity-50";

const sizes: Record<Size, string> = {
  md: "py-2 px-3",     // Profile
  lg: "py-2.5 px-3",   // formulaires Sign in / Sign up
  xl: "py-4 px-5",     // grande barre de recherche
};

const labelClass = "text-small font-medium text-text";
const errorClass = "text-small text-danger";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  size?: Size;
  label?: string;
  error?: string;
};

export default function Input({ size = "lg", label, error, id, className = "", ...props }: InputProps) {
  const input = (
    <input
      id={id}
      className={`${base} ${sizes[size]} ${error ? "border-danger" : ""} ${className}`.trim()}
      aria-invalid={!!error}
      {...props}
    />
  );

  // sans label ni erreur : juste le champ
  if (!label && !error) return input;

  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className={labelClass}>{label}</label>}
      {input}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}