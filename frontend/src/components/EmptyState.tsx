import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { Button } from './ui';

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-hyrm-muted/30">
        <BrandMark size={52} />
      </div>
      <h2 className="font-display text-[22px] font-bold text-hyrm-text">Alt er klaret</h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-hyrm-muted">
        Ingen påmindelser lige nu. Tilføj en, så holder jeg øje og nagger dig, til den er klaret.
      </p>
      <Link to="/create" className="mt-8 w-full max-w-xs">
        <Button fullWidth>Ny opgave</Button>
      </Link>
    </div>
  );
}
