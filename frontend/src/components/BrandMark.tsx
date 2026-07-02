type BrandMarkVariant = 'mark' | 'rounded' | 'icon';

const SRC: Record<BrandMarkVariant, string> = {
  mark: '/icons/hyrm-mark.svg',
  rounded: '/icons/hyrm-icon-rounded.svg',
  icon: '/icons/hyrm-icon.svg',
};

export function BrandMark({
  size = 60,
  variant = 'mark',
}: {
  size?: number;
  variant?: BrandMarkVariant;
}) {
  return (
    <img
      src={SRC[variant]}
      alt=""
      width={size}
      height={size}
      className="block shrink-0"
      aria-hidden
      draggable={false}
    />
  );
}
