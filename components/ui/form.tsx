import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BaseProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  optional?: boolean;
};

function describedBy(id: string, hint?: ReactNode, error?: string | null, hasHint?: boolean) {
  const ids: string[] = [];
  if (hint && hasHint) ids.push(`${id}-hint`);
  if (error) ids.push(`${id}-error`);
  return ids.length ? ids.join(" ") : undefined;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & BaseProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, optional, className, id, ...rest },
  ref
) {
  const auto = useId();
  const fieldId = id ?? `f-${auto}`;
  const hasHint = typeof hint === "string" && hint.length > 0;
  return (
    <div className="w-full">
      {label && (
        <label className="label" htmlFor={fieldId}>
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
          {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        className={["field", className ?? ""].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error, hasHint)}
        aria-required={required || undefined}
        required={required}
        {...rest}
      />
      {hint && hasHint && (
        <p className="hint" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${fieldId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & BaseProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, optional, className, id, ...rest },
  ref
) {
  const auto = useId();
  const fieldId = id ?? `t-${auto}`;
  const hasHint = typeof hint === "string" && hint.length > 0;
  return (
    <div className="w-full">
      {label && (
        <label className="label" htmlFor={fieldId}>
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
          {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={["field", className ?? ""].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error, hasHint)}
        aria-required={required || undefined}
        required={required}
        {...rest}
      />
      {hint && hasHint && (
        <p className="hint" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${fieldId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & BaseProps & { children: ReactNode };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, optional, className, id, children, ...rest },
  ref
) {
  const auto = useId();
  const fieldId = id ?? `s-${auto}`;
  const hasHint = typeof hint === "string" && hint.length > 0;
  return (
    <div className="w-full">
      {label && (
        <label className="label" htmlFor={fieldId}>
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
          {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        className={["field", className ?? ""].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error, hasHint)}
        aria-required={required || undefined}
        required={required}
        {...rest}
      >
        {children}
      </select>
      {hint && hasHint && (
        <p className="hint" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${fieldId}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export function Checkbox({
  label,
  hint,
  className,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: string }) {
  const auto = useId();
  const fieldId = id ?? `c-${auto}`;
  return (
    <div className={className}>
      <div className="flex items-start gap-2.5">
        <input
          id={fieldId}
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-lineStrong accent-[#0B9B70]"
          {...rest}
        />
        <label htmlFor={fieldId} className="cursor-pointer text-sm text-navy-700">
          {label}
        </label>
      </div>
      {hint && <p className="hint ml-[26px]">{hint}</p>}
    </div>
  );
}
