import { useEffect, useState } from 'react';
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
      () => setLoading(false)
    );
  }, [user, allowed]);

  return { templates, loading };
}

export function useOpenOccurrences() {
  const { user, allowed } = useAuth();
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([]);
  const [loading, setLoading] = useState(true);

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
      () => setLoading(false)
    );
  }, [user, allowed]);

  return { occurrences, loading };
}

export function useDispatchHealth() {
  const { user, allowed } = useAuth();
  const [health, setHealth] = useState<DispatchHealth | null>(null);

  useEffect(() => {
    if (!user || !allowed) {
      setHealth(null);
      return;
    }

    return onSnapshot(doc(db, COLLECTIONS.dispatchHealth), (snap) => {
      if (snap.exists()) {
        setHealth(snap.data() as DispatchHealth);
      }
    });
  }, [user, allowed]);

  return health;
}
