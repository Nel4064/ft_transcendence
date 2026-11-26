import type { SelectHTMLAttributes } from "react";
import { fieldClass, labelClass, type Size } from "../Input/Input";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: Size;
  label?: string;
};

// Dropdown with the same look and label as <Input>; the <option>s go in children
export default function Select({ size = "lg", label, id, className = "", children, ...props }: SelectProps) {
  const select = (
    <select id={id} className={fieldClass(size, className)} {...props}>
      {children}
    </select>
  );

  if (!label) return select;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelClass}>{label}</label>
      {select}
    </div>
  );
}
