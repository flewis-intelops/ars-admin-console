import * as React from "react";

export const CLASSIFICATION_TEXT = "DEMO // SIMULATED HUMINT // NOT REAL INTELLIGENCE";

export function ClassificationBanner({ position = "top" }: { position?: "top" | "bottom" }) {
  return (
    <div
      className="w-full text-center py-1 text-[10px] tracking-[0.25em] font-mono font-semibold text-white"
      style={{ backgroundColor: "var(--classification-red)", letterSpacing: "0.25em" }}
      role="note"
      aria-label={`Classification banner ${position}`}
    >
      {CLASSIFICATION_TEXT}
    </div>
  );
}

export function CornerBrackets({
  children,
  className = "",
  size = 10,
}: {
  children: React.ReactNode;
  className?: string;
  size?: number;
}) {
  const s = `${size}px`;
  const color = "var(--hairline-strong)";
  const corner = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: s,
    height: s,
    borderColor: color,
    borderStyle: "solid",
    ...pos,
  });
  return (
    <div className={`relative ${className}`}>
      <span style={corner({ top: 0, left: 0, borderWidth: "1px 0 0 1px" })} />
      <span style={corner({ top: 0, right: 0, borderWidth: "1px 1px 0 0" })} />
      <span style={corner({ bottom: 0, left: 0, borderWidth: "0 0 1px 1px" })} />
      <span style={corner({ bottom: 0, right: 0, borderWidth: "0 1px 1px 0" })} />
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono text-[10px] tracking-[0.2em] uppercase mb-3 flex items-center gap-2"
      style={{ color: "var(--amber)" }}
    >
      <span style={{ color: "var(--amber-dim)" }}>──</span>
      <span>{children}</span>
    </div>
  );
}

export function PlaceholderBadge() {
  return (
    <span
      className="absolute top-2 right-2 font-mono text-[9px] uppercase pointer-events-none select-none"
      style={{ color: "var(--amber-dim)", letterSpacing: "0.14em" }}
    >
      PLACEHOLDER · v0.1
    </span>
  );
}

export function Pill({
  children,
  tone = "amber",
}: {
  children: React.ReactNode;
  tone?: "amber" | "green" | "red" | "orange" | "muted";
}) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    amber: { bg: "rgba(201,169,97,0.08)", fg: "var(--amber)", border: "var(--hairline-strong)" },
    green: { bg: "rgba(16,185,129,0.08)", fg: "var(--green)", border: "rgba(16,185,129,0.4)" },
    red: { bg: "rgba(220,38,38,0.08)", fg: "var(--red-light)", border: "rgba(220,38,38,0.4)" },
    orange: { bg: "rgba(245,158,11,0.08)", fg: "var(--orange)", border: "rgba(245,158,11,0.4)" },
    muted: { bg: "transparent", fg: "var(--amber-dim)", border: "var(--hairline)" },
  };
  const c = colors[tone];
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] font-mono text-[10px] tracking-[0.1em] uppercase"
      style={{ backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
    >
      {children}
    </span>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      {...rest}
      className={`font-mono text-[11px] tracking-[0.18em] uppercase px-4 py-2 transition-colors disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: "var(--amber)",
        color: "#0A0B0D",
        border: "1px solid var(--amber)",
        ...style,
      }}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", style, ...rest } = props;
  return (
    <button
      {...rest}
      className={`font-mono text-[11px] tracking-[0.18em] uppercase px-4 py-2 transition-colors hover:bg-white/5 disabled:opacity-50 ${className}`}
      style={{
        color: "var(--amber)",
        border: "1px solid var(--hairline-strong)",
        backgroundColor: "transparent",
        ...style,
      }}
    />
  );
}

export function Panel({
  title,
  placeholder,
  children,
  className = "",
}: {
  title?: string;
  placeholder?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CornerBrackets className={className}>
      <div
        className="relative p-4"
        style={{ backgroundColor: "var(--panel)", border: "1px solid var(--hairline)" }}
      >
        {placeholder && <PlaceholderBadge />}
        {title && <SectionLabel>{title}</SectionLabel>}
        {children}
      </div>
    </CornerBrackets>
  );
}
