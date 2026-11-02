'use client';

interface FormErrorSummaryProps {
  errors: Record<string, string>;
  labels: Record<string, string>;
  serverError?: string | null;
}

export default function FormErrorSummary({ errors, labels, serverError }: FormErrorSummaryProps) {
  const entries = Object.entries(errors);
  if (entries.length === 0 && !serverError) return null;

  const items = entries.map(([id, message]) => {
    const label = labels[id] ?? id;
    return message.toLowerCase().includes(label.toLowerCase())
      ? message
      : `${label} ${message}`;
  });

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-3 rounded-lg border border-warn-600/30 bg-warn-100 p-3 text-sm text-warn-700"
    >
      {serverError ? (
        <p>{serverError}</p>
      ) : (
        <p>
          Please fix {entries.length} {entries.length === 1 ? 'thing' : 'things'}: {items.join('; ')}
        </p>
      )}
    </div>
  );
}
