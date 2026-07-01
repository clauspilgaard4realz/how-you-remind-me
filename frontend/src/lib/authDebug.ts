const PREFIX = '[HYRM auth]';

export function authLog(message: string, data?: Record<string, unknown>): void {
  if (data !== undefined) {
    console.log(`${PREFIX} ${message}`, data);
  } else {
    console.log(`${PREFIX} ${message}`);
  }
}

export function authWarn(message: string, data?: Record<string, unknown>): void {
  if (data !== undefined) {
    console.warn(`${PREFIX} ${message}`, data);
  } else {
    console.warn(`${PREFIX} ${message}`);
  }
}

export function authLogError(message: string, err?: unknown): void {
  console.error(`${PREFIX} ${message}`, err);
}

export function firebaseErrorDetails(err: unknown): Record<string, unknown> {
  if (err && typeof err === 'object' && 'code' in err) {
    const e = err as { code?: string; message?: string; customData?: unknown };
    return { code: e.code, message: e.message, customData: e.customData };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}
