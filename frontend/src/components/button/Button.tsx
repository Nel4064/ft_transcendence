import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "admin" | "danger";
type Size = "md" | "lg" | "xl";

const base =
  "rounded-md text-control font-bold cursor-pointer transition-colors " +
  "disabled:opacity-50 disabled:cursor-default";

const sizes: Record<Size, string> = {
  md: "py-2 px-4",    // Navbar, Profile (par défaut)
  lg: "py-2.5 px-4",  // formulaires : même hauteur que les inputs
  xl: "py-4 px-8",    // grand bouton (Search)
};

const variants: Record<Variant, string> = {
  primary: "bg-brand hover:bg-brand-hover text-white",
  secondary: "border border-border text-center hover:bg-surface",
  admin: "bg-admin hover:bg-admin-hover text-white",
  danger: "bg-danger hover:bg-danger/90 text-white",
};

// Pour les <Link>/<NavLink> qui doivent ressembler à un bouton
export function buttonClass(variant: Variant = "primary", size: Size = "md", className = "")
{
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
