'use client';

import { cloneElement, isValidElement, ReactElement, ReactNode } from 'react';

interface FormControlProps {
  id?: string;
  required?: boolean;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

interface FormFieldProps {
  id: string;
  label: ReactNode;
  labelAddon?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactElement<FormControlProps> | ((controlProps: FormControlProps) => ReactNode);
  className?: string;
}

export default function FormField({
  id,
  label,
  labelAddon,
  required = false,
  hint,
  error,
  children,
  className,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const controlProps: FormControlProps = {
    id,
    required,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  };
  const control = typeof children === 'function'
    ? children(controlProps)
    : isValidElement<FormControlProps>(children)
      ? cloneElement(children, controlProps)
      : children;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-ink-700">
          {label}
          {required && (
            <>
              <span aria-hidden="true"> *</span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
        {labelAddon}
      </div>
      {control}
      {hint && <p id={hintId} className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p id={errorId} className="mt-1 text-xs font-medium text-warn-700">{error}</p>}
    </div>
  );
}
