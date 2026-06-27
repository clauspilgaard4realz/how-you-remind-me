import { QUARTER_MINUTES } from '@hyrm/shared';

export function formatLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat('da-DK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Copenhagen',
  }).format(new Date(iso));
}

export function quarterTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of QUARTER_MINUTES) {
      options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return options;
}

export function combineLocalDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function defaultReminderStart(): { date: string; time: string } {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const minutes = now.getMinutes();
  const nextQuarter = QUARTER_MINUTES.find((m) => m > minutes) ?? 0;
  let hour = now.getHours();
  let minute = nextQuarter;
  if (nextQuarter === 0 && minutes >= 45) {
    hour += 1;
  } else if (minutes >= 45) {
    minute = 0;
    hour += 1;
  }
  return {
    date,
    time: `${String(hour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}
