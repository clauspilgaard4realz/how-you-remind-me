import { Navigate } from 'react-router-dom';
import { useState } from 'react';
import { allowedUid } from '../lib/config';
import { useAuth } from '../hooks/useAuth';
import { BrandMark } from '../components/BrandMark';
import { Banner } from '../components/ui';

export function LoginPage() {
  const { user, allowed, loading, authError, signIn, signOutUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-7">
        <p className="text-sm text-hyrm-muted">Vent et øjeblik…</p>
      </div>
    );
  }

  if (user && allowed) {
    return <Navigate to="/" replace />;
  }

  if (user && !allowed) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-7">
        <Banner tone="error">
          <p>Denne Firebase-konto ({user.email}) matcher ikke whitelist.</p>
          <p className="mt-2 font-mono text-xs">
            Din UID (kopiér til VITE_ALLOWED_UID i frontend/.env):
            <br />
            {user.uid}
          </p>
          {allowedUid ? (
            <p className="mt-2 font-mono text-xs">Forventet i .env: {allowedUid}</p>
          ) : (
            <p className="mt-2">VITE_ALLOWED_UID er tom — udfyld frontend/.env og genstart dev-server.</p>
          )}
        </Banner>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="mt-4 h-11 rounded-[var(--radius-btn)] bg-hyrm-elevated text-sm font-semibold text-hyrm-text"
        >
          Log ud
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-7 pb-12 pt-[calc(1.75rem+var(--safe-top))]">
      <BrandMark size={60} />
      <p className="font-display mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-hyrm-accent">
        How you remind me
      </p>
      <h1 className="font-display mt-3 text-[34px] font-bold leading-tight text-hyrm-text">
        Så du husker det.
      </h1>
      <p className="mt-3.5 text-[14.5px] leading-relaxed text-hyrm-muted">
        Privat reminder-app til én bruger. Den nagger dig igen og igen — til opgaven er klaret.
      </p>

      {(authError || localError) && (
        <p className="mt-4 text-sm text-hyrm-danger">{authError ?? localError}</p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setLocalError(null);
          setBusy(true);
          void signIn()
            .catch((err: unknown) => {
              setLocalError(err instanceof Error ? err.message : 'Login fejlede');
            })
            .finally(() => setBusy(false));
        }}
        className="mt-8 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl bg-hyrm-text text-[15px] font-bold text-hyrm-bg disabled:opacity-50"
      >
        <span
          className="h-5 w-5 rounded-full"
          style={{
            background:
              'conic-gradient(#ea4335 0 25%, #fbbc05 0 50%, #34a853 0 75%, #4285f4 0 100%)',
          }}
        />
        {busy ? 'Logger ind…' : 'Log ind med Google'}
      </button>

      <p className="mt-4 text-center text-xs text-hyrm-muted-dim">
        Kun dig. Ingen konti, ingen deling.
      </p>
    </div>
  );
}
