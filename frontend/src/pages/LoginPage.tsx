import { allowedUid } from '../lib/config';
import { useAuth } from '../hooks/useAuth';
import { AppShell, Banner, Button, Card } from '../components/ui';

export function LoginPage() {
  const { user, allowed, loading, signIn, signOutUser } = useAuth();

  if (loading) {
    return (
      <AppShell title="Logger ind…">
        <p className="text-sm text-slate-400">Vent et øjeblik…</p>
      </AppShell>
    );
  }

  if (user && !allowed) {
    return (
      <AppShell title="Ingen adgang">
        <Banner tone="error">
          Denne Firebase-konto ({user.email}) er ikke whitelisted. Forventet UID: {allowedUid}
        </Banner>
        <Button variant="secondary" onClick={() => void signOutUser()}>
          Log ud
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell title="Log ind">
      <Card>
        <p className="mb-4 text-sm leading-relaxed text-slate-300">
          Privat reminder-app til én bruger. Log ind med Google for at fortsætte.
        </p>
        <Button onClick={() => void signIn()}>Log ind med Google</Button>
      </Card>
    </AppShell>
  );
}
