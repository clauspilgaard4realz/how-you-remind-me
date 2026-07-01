import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { DispatchHealth, TaskOccurrence, TaskTemplate } from '@hyrm/shared';
import { COLLECTIONS } from '@hyrm/shared';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export function useTaskTemplates() {
  const { user, allowed } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !allowed) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.taskTemplates),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snap) => {
        setTemplates(snap.docs.map((d) => d.data() as TaskTemplate));
        setLoading(false);
      },
      (error) => {
        console.error('task_templates listener failed', error);
        setLoading(false);
      }
    );
  }, [user, allowed]);

  return { templates, loading };
}

export function useOpenOccurrences() {
  const { user, allowed } = useAuth();
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [snoozeOverrides, setSnoozeOverrides] = useState<
    Record<string, Partial<TaskOccurrence>>
  >({});

  useEffect(() => {
    if (!user || !allowed) {
      setOccurrences([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.taskOccurrences),
      where('ownerId', '==', user.uid),
      where('status', 'in', ['open', 'snoozed', 'overdue']),
      orderBy('scheduledAt', 'asc')
    );

    return onSnapshot(
      q,
      (snap) => {
        setOccurrences(snap.docs.map((d) => d.data() as TaskOccurrence));
        setLoading(false);
      },
      (error) => {
        console.error('task_occurrences listener failed', error);
        setLoading(false);
      }
    );
  }, [user, allowed]);

  useEffect(() => {
    const currentIds = new Set(occurrences.map((o) => o.id));

    setCompletedIds((prev) => {
      const next = new Set([...prev].filter((id) => currentIds.has(id)));
      return next.size === prev.size ? prev : next;
    });

    setSnoozeOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!currentIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [occurrences]);

  const visibleOccurrences = useMemo(
    () =>
      occurrences
        .filter((o) => !completedIds.has(o.id))
        .map((o) => ({ ...o, ...snoozeOverrides[o.id] })),
    [occurrences, completedIds, snoozeOverrides]
  );

  const markCompletedLocally = useCallback((id: string) => {
    setCompletedIds((prev) => new Set(prev).add(id));
  }, []);

  const unmarkCompletedLocally = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const applySnoozeLocally = useCallback((id: string, snoozedUntil: string) => {
    setSnoozeOverrides((prev) => ({
      ...prev,
      [id]: {
        status: 'snoozed',
        snoozedUntil,
        nextReminderAt: snoozedUntil,
      },
    }));
  }, []);

  return {
    occurrences: visibleOccurrences,
    loading,
    markCompletedLocally,
    unmarkCompletedLocally,
    applySnoozeLocally,
  };
}

export function useDispatchHealth() {
  const { user, allowed } = useAuth();
  const [health, setHealth] = useState<DispatchHealth | null>(null);

  useEffect(() => {
    if (!user || !allowed) {
      setHealth(null);
      return;
    }

    return onSnapshot(
      doc(db, COLLECTIONS.dispatchHealth),
      (snap) => {
        if (snap.exists()) {
          setHealth(snap.data() as DispatchHealth);
        }
      },
      (error) => {
        console.error('dispatch_health listener failed', error);
      }
    );
  }, [user, allowed]);

  return health;
}
