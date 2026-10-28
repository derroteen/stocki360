"use client";

function OdometerDigit({ digit }: { digit: string }) {
  if (!/\d/.test(digit)) {
    return <span className="inline-block px-[0.015em]">{digit}</span>;
  }

  return (
    <span className="live-odometer-window" aria-hidden="true">
      <span className="live-odometer-column" style={{ transform: `translateY(-${Number(digit)}em)` }}>
        {Array.from({ length: 10 }, (_, value) => (
          <span key={value} className="block h-[1em] leading-[1em]">
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function MetricOdometer({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const formatted = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);

  return (
    <span className="inline-flex items-baseline tabular-nums" aria-label={`${prefix}${formatted}${suffix}`}>
      {prefix}
      {formatted.split("").map((digit, index) => (
        <OdometerDigit key={`${index}-${digit === "," ? "separator" : "digit"}`} digit={digit} />
      ))}
      {suffix}
    </span>
  );
}
