import type { ReactNode } from "react";

interface StatusCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warn";
  actions?: ReactNode;
}

export function StatusCard({ label, value, hint, tone = "default", actions }: StatusCardProps) {
  return (
    <article className={`status-card tone-${tone}`}>
      <p className="status-card__label">{label}</p>
      <h3 className="status-card__value">{value}</h3>
      {hint ? <p className="status-card__hint">{hint}</p> : null}
      {actions ? <div className="status-card__actions">{actions}</div> : null}
    </article>
  );
}
