export function SectionHeader({
  label,
  count,
  danger,
}: {
  label: string;
  count?: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] ${
        danger ? 'text-hyrm-danger' : 'text-hyrm-muted-dim'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-hyrm-danger px-1.5 py-0.5 text-[10px] font-bold text-hyrm-bg">
          {count}
        </span>
      )}
    </div>
  );
}
