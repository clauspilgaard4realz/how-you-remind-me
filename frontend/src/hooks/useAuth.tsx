import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { authLog, authLogError, authWarn, firebaseErrorDetails } from '../lib/authDebug';
import { allowedUid } from '../lib/config';
import { auth, googleProvider } from '../lib/firebase';
import { isStandalonePwa } from '../lib/push';

/** StrictMode kalder effects to gange — getRedirectResult må kun køres én gang per side-load. */
let redirectResultPromise: Promise<UserCredential | null> | null = null;

function consumeRedirectResult(): Promise<UserCredential | null> {
  redirectResultPromise ??= getRedirectResult(auth);
  return redirectResultPromise;
}

function cameFromFirebaseAuthHandler(): boolean {
  return document.referrer.includes('/__/auth/handler');
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  allowed: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};

    void (async () => {
      authLog('bootstrap start', {
        href: window.location.href,
        referrer: document.referrer,
        prod: import.meta.env.PROD,
        standalone: isStandalonePwa(),
        allowedUidConfigured: Boolean(allowedUid),
      });

      let redirectResult: UserCredential | null = null;
      try {
        redirectResult = await consumeRedirectResult();
        authLog('getRedirectResult', {
          hasResult: Boolean(redirectResult),
          uid: redirectResult?.user?.uid ?? null,
          email: redirectResult?.user?.email ?? null,
        });
      } catch (err) {
        authLogError('getRedirectResult failed', firebaseErrorDetails(err));
        if (!cancelled) {
          const details = firebaseErrorDetails(err);
          setAuthError(`Redirect login fejlede (${String(details.code ?? 'unknown')})`);
        }
      }

      try {
        await auth.authStateReady();
      } catch (err) {
        authLogError('authStateReady failed', firebaseErrorDetails(err));
      }

      authLog('authStateReady', {
        currentUserUid: auth.currentUser?.uid ?? null,
        currentUserEmail: auth.currentUser?.email ?? null,
      });

      const fromOAuthReturn = cameFromFirebaseAuthHandler();
      if (fromOAuthReturn) {
        authLog('detected return from Firebase auth handler', {
          hasRedirectResult: Boolean(redirectResult),
          hasCurrentUser: Boolean(auth.currentUser),
        });
      }

      if (fromOAuthReturn && !auth.currentUser && !redirectResult?.user) {
        authWarn('OAuth return without session — redirect state was not restored', {
          referrer: document.referrer,
          hint: 'Browser may block cross-origin storage; popup login is used outside PWA',
        });
        if (!cancelled) {
          setAuthError(
            'Google-login gik igennem, men sessionen blev ikke gemt. Prøv igen i almindelig browser (popup-login).'
          );
        }
      }

      if (cancelled) return;

      const resolvedUser = redirectResult?.user ?? auth.currentUser;
      if (resolvedUser) {
        authLog('resolved user after redirect/bootstrap', {
          uid: resolvedUser.uid,
          email: resolvedUser.email,
        });
        setUser(resolvedUser);
      }

      unsub = onAuthStateChanged(auth, (next) => {
        authLog('onAuthStateChanged', {
          uid: next?.uid ?? null,
          email: next?.email ?? null,
        });
        if (!cancelled) {
          setUser(next);
          setLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const allowed = Boolean(user && user.uid === allowedUid);

  useEffect(() => {
    if (loading) return;
    authLog('state settled', {
      hasUser: Boolean(user),
      uid: user?.uid ?? null,
      email: user?.email ?? null,
      allowed,
      allowedUidPrefix: allowedUid ? `${allowedUid.slice(0, 8)}…` : '(tom)',
    });
    if (user && !allowed) {
      authWarn('user logged in but UID not on whitelist', {
        actualUid: user.uid,
        expectedUidPrefix: allowedUid ? `${allowedUid.slice(0, 8)}…` : '(tom)',
      });
    }
  }, [user, loading, allowed]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    const useRedirect = import.meta.env.PROD && isStandalonePwa();

    authLog('signIn clicked', {
      useRedirect,
      prod: import.meta.env.PROD,
      standalone: isStandalonePwa(),
    });

    if (useRedirect) {
      authLog('starting signInWithRedirect');
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    try {
      authLog('starting signInWithPopup');
      const result = await signInWithPopup(auth, googleProvider);
      authLog('signInWithPopup success', {
        uid: result.user.uid,
        email: result.user.email,
      });
    } catch (err) {
      authLogError('signInWithPopup failed', firebaseErrorDetails(err));
      throw err;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    authLog('signOut');
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const value = useMemo(
    () => ({ user, loading, allowed, authError, signIn, signOutUser, getIdToken }),
    [user, loading, allowed, authError, signIn, signOutUser, getIdToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
