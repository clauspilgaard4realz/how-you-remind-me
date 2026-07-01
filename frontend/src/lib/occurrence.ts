/** True when snooze end time has passed (occurrence should be active again). */
export function isSnoozeExpired(snoozedUntil: string | undefined): boolean {
  if (!snoozedUntil) return false;
  return new Date(snoozedUntil).getTime() <= Date.now();
}

export function displayOccurrenceStatus(status: string, snoozedUntil?: string): string {
  if (status === 'snoozed' && isSnoozeExpired(snoozedUntil)) {
    return 'Venter på påmindelse';
  }
  return status;
}
