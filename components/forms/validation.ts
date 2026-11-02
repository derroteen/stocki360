export type FormErrors = Record<string, string>;

export interface FieldRule {
  id: string;
  label: string;
  value: string;
  required?: boolean;
  trim?: boolean;
  min?: number;
  max?: number;
  wholeNumber?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
}

export function validateFields(rules: FieldRule[]): FormErrors {
  const errors: FormErrors = {};

  for (const rule of rules) {
    const value = rule.trim === false ? rule.value : rule.value.trim();
    if (rule.required && !value) {
      errors[rule.id] = `${rule.label} is required`;
      continue;
    }

    if (!value) continue;

    if (rule.pattern && !rule.pattern.test(value)) {
      errors[rule.id] = rule.patternMessage ?? `Enter a valid ${rule.label.toLowerCase()}`;
      continue;
    }

    if (rule.min !== undefined || rule.max !== undefined || rule.wholeNumber) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        errors[rule.id] = `Enter a valid ${rule.label.toLowerCase()}`;
      } else if (rule.wholeNumber && !Number.isInteger(number)) {
        errors[rule.id] = `${rule.label} must be a whole number`;
      } else if (rule.min !== undefined && number < rule.min) {
        errors[rule.id] = rule.min === 0
          ? `${rule.label} cannot be less than 0`
          : `${rule.label} must be at least ${rule.min}`;
      } else if (rule.max !== undefined && number > rule.max) {
        errors[rule.id] = `${rule.label} must be no more than ${rule.max}`;
      }
    }
  }

  return errors;
}

export function focusFirstInvalid(errors: FormErrors): void {
  const firstId = Object.keys(errors)[0];
  if (!firstId) return;

  const element = document.getElementById(firstId);
  if (element instanceof HTMLElement) {
    element.style.scrollMarginBlockStart = '6rem';
  }
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (element instanceof HTMLElement) {
    window.setTimeout(() => element.focus({ preventScroll: true }), 0);
  }
}

export function clearValidFieldError(
  errors: FormErrors,
  id: string,
  rule: FieldRule,
): FormErrors {
  const fieldErrors = validateFields([rule]);
  if (!fieldErrors[id] && errors[id]) {
    const next = { ...errors };
    delete next[id];
    return next;
  }
  return errors;
}
