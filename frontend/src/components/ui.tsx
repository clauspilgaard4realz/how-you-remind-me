import type { ReactNode } from 'react';

export function AppShell({
  title,
  eyebrow,
  children,
  actions,
  headerExtra,
  hideHeader,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
  headerExtra?: ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-[22px] pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1.25rem+var(--safe-top))]">
      {!hideHeader && (title || eyebrow || actions) && (
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-hyrm-accent">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="font-display mt-2 text-[27px] font-bold leading-none text-hyrm-text">
                {title}
              </h1>
            )}
            {headerExtra}
          </div>
          {actions && <div className="flex shrink-0 items-start gap-2">{actions}</div>}
        </header>
      )}
      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border border-white/6 bg-hyrm-surface p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className = '',
  fullWidth,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  fullWidth?: boolean;
}) {
  const styles = {
    primary: 'bg-hyrm-accent text-hyrm-bg hover:brightness-110',
    secondary: 'bg-hyrm-elevated text-hyrm-text hover:brightness-110',
    danger:
      'border border-hyrm-danger/40 bg-transparent text-hyrm-danger hover:bg-hyrm-danger/10',
    ghost: 'bg-transparent text-hyrm-muted hover:text-hyrm-text',
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-[var(--radius-btn)] px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  selected,
  onClick,
  accent,
  className = '',
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  accent?: boolean;
  className?: string;
}) {
  const base =
    'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-pill)] px-3.5 py-2 text-[12.5px] font-semibold transition';
  const selectedStyle = selected
    ? accent
      ? 'border border-hyrm-accent/50 bg-hyrm-elevated text-hyrm-accent'
      : 'bg-hyrm-accent text-hyrm-bg font-bold'
    : 'bg-hyrm-surface text-hyrm-time';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${selectedStyle} ${className}`}>
        {children}
      </button>
    );
  }

  return <span className={`${base} ${selectedStyle} ${className}`}>{children}</span>;
}

export function Banner({
  tone,
  children,
}: {
  tone: 'warning' | 'error' | 'info';
  children: ReactNode;
}) {
  const styles = {
    warning: 'border-hyrm-accent/40 bg-hyrm-accent-soft text-hyrm-text',
    error: 'border-hyrm-danger/40 bg-hyrm-overdue-bg text-hyrm-danger',
    info: 'border-hyrm-success/30 bg-hyrm-success/10 text-hyrm-text',
  }[tone];

  return (
    <div className={`rounded-[14px] border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}

export function NagChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] bg-hyrm-accent-soft px-2.5 py-1 text-[10.5px] font-semibold text-hyrm-accent">
      <span className="h-1.5 w-1.5 rounded-full bg-hyrm-accent" />
      {label}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: 'open' | 'completed' | 'overdue' | 'snoozed';
}) {
  const styles = {
    open: 'bg-hyrm-success/15 text-hyrm-success',
    completed: 'bg-hyrm-muted/20 text-hyrm-muted',
    overdue: 'bg-hyrm-danger/15 text-hyrm-danger',
    snoozed: 'bg-hyrm-accent-soft text-hyrm-accent',
  }[status];
  const labels = {
    open: 'Åben',
    completed: 'Klaret',
    overdue: 'Forsinket',
    snoozed: 'Udsat',
  }[status];

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}>{labels}</span>
  );
}
