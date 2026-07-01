export function BrandMark({ size = 60 }: { size?: number }) {
  const radius = Math.round(size * 0.33);
  const iconSize = Math.round(size * 0.33);
  return (
    <div
      className="flex items-center justify-center bg-gradient-to-br from-hyrm-accent to-hyrm-danger shadow-[0_12px_30px_-8px_rgba(255,138,76,0.6)]"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <div
        className="relative rounded-full border-[3px] border-hyrm-bg"
        style={{ width: iconSize, height: iconSize }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-sm bg-hyrm-bg"
          style={{ top: -iconSize * 0.45, width: 3, height: iconSize * 0.4 }}
        />
      </div>
    </div>
  );
}
