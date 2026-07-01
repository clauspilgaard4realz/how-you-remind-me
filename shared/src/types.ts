export type TaskPriority = 'normal' | 'important' | 'high';
export type OccurrenceStatus =
  | 'open'
  | 'completed'
  | 'snoozed'
  | 'overdue'
  | 'expired'
  | 'cancelled'
  | 'cancelled_by_template_change';

export type NotificationAttemptStatus =
  | 'pending'
  | 'leased'
  | 'provider_accepted'
  | 'retry_scheduled'
  | 'failed_permanent';

export type ReminderPhaseAnchor =
  | 'template_start'
  | 'occurrence_scheduled_at'
  | 'template_deadline'
  | 'absolute_datetime';

export interface ReminderPhase {
  id: string;
  anchor: ReminderPhaseAnchor;
  startsOffsetMinutes?: number;
  endsOffsetMinutes?: number;
  startAt?: string;
  endAt?: string;
  cadence: {
    unit: 'minutes' | 'hours' | 'days';
    every: number;
  };
  channels: ('push' | 'email')[];
}

export type RecurrenceKind = 'once' | 'daily' | 'weekly' | 'weekdays';
export type NagCadence = '15m' | '1h' | 'daily';

export interface TaskSchedule {
  recurrence: RecurrenceKind;
  /** HH:mm i Europe/Copenhagen, kvarterstid */
  timeOfDay: string;
  /** Luxon weekday 1=man … 7=søn — for weekly/weekdays */
  daysOfWeek?: number[];
  startLocalDate: string;
  endLocalDate?: string;
}

export interface NagConfig {
  cadence: NagCadence;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'every_x_days' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  timeOfDay: string;
}

export interface TaskTemplateBase {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  active: boolean;
  timezone: 'Europe/Copenhagen';
  reminderPhases: ReminderPhase[];
  group?: string;
  priority: TaskPriority;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface SingleTaskTemplate extends TaskTemplateBase {
  type: 'single';
  reminderStartsAt: string;
  deadlineAt?: string;
}

export interface RecurringTaskTemplate extends TaskTemplateBase {
  type: 'recurring';
  schedule: TaskSchedule;
  nag: NagConfig;
  /** @deprecated legacy — brug schedule */
  startLocalDate?: string;
  endLocalDate?: string;
  recurrenceRule?: RecurrenceRule;
}

export type TaskTemplate = SingleTaskTemplate | RecurringTaskTemplate;

export interface TaskOccurrence {
  id: string;
  ownerId: string;
  templateId: string;
  templateRevision: number;
  scheduledAt: string;
  scheduledLocalDate: string;
  scheduledLocalTime: string;
  status: OccurrenceStatus;
  completedAt?: string;
  snoozedUntil?: string;
  nextReminderAt?: string;
  currentPhaseId?: string;
  scheduleSnapshot: Record<string, unknown>;
  reminderPlanSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationAttempt {
  id: string;
  occurrenceId: string;
  templateId: string;
  phaseId: string;
  scheduledSlotAt: string;
  status: NotificationAttemptStatus;
  leaseId?: string;
  leaseExpiresAt?: string;
  retryAt?: string;
  attemptCount: number;
  providerAcceptedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushDevice {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
  platform: string;
  createdAt: string;
  lastSeenAt: string;
  lastProviderAcceptedAt?: string;
  failureCount: number;
  active: boolean;
}

export interface DispatchHealth {
  lastDispatchStartedAt: string;
  lastDispatchCompletedAt: string;
  lastSlotProcessed: string;
  attemptsInLastRun: number;
  failuresInLastRun: number;
  activeDeviceCount: number;
  openOccurrencesWithoutDevice: number;
  consecutiveFailures: number;
  emailConfigured?: boolean;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  schedule: TaskSchedule;
  nag: NagConfig;
  group?: string;
  priority?: TaskPriority;
}

export interface CreateSingleTaskRequest {
  title: string;
  description?: string;
  reminderStartsAt: string;
  deadlineAt?: string;
  reminderPhases: ReminderPhase[];
  group?: string;
  priority?: TaskPriority;
}

export interface RegisterPushDeviceRequest {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  platform?: string;
}
