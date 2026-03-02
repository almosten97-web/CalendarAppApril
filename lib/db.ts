'use client';

import { openDB, type IDBPDatabase } from 'idb';

export type Event = {
  id: string;
  client_name: string;
  title: string;
  start_time: string;   // ISO string
  end_time: string | null;
  location: string | null;
  notes: string | null;
  raw_text: string | null;
  color: string;
  created_at: string;
};

const DB_NAME = 'aprils-schedule';
const STORE = 'events';

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('start_time', 'start_time');
      }
    },
  });
}

export async function getAllEvents(): Promise<Event[]> {
  const db = await getDB();
  const all = await db.getAll(STORE) as Event[];
  return all.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export async function addEvents(events: Event[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all([
    ...events.map((e) => tx.store.put(e)),
    tx.done,
  ]);
}

export async function updateEvent(id: string, updates: Partial<Omit<Event, 'id' | 'created_at'>>): Promise<Event> {
  const db = await getDB();
  const existing = await db.get(STORE, id) as Event | undefined;
  if (!existing) throw new Error('Event not found');
  const updated: Event = { ...existing, ...updates };
  await db.put(STORE, updated);
  return updated;
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}
