import type { ReactNode } from 'react';

export function AppShell({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-sky-400">How You Remind Me</p>
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
        </div>
        {actions}
      </header>
      <main className="flex flex-1 flex-col gap-4">{children}</main>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 ${className}`}>
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
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const styles = {
    primary: 'bg-sky-500 text-slate-950 hover:bg-sky-400',
    secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: 'warning' | 'error' | 'info';
  children: ReactNode;
}) {
  const styles = {
    warning: 'border-amber-500/40 bg-amber-950/40 text-amber-100',
    error: 'border-rose-500/40 bg-rose-950/40 text-rose-100',
    info: 'border-sky-500/40 bg-sky-950/40 text-sky-100',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>{children}</div>
  );
}
