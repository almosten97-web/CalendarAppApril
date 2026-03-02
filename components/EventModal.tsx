'use client';

import { useState } from 'react';
import { updateEvent, deleteEvent, type Event } from '@/lib/db';

type Props = {
  event: Event;
  onClose: () => void;
  onUpdated: (updated: Event) => void;
  onDeleted: (id: string) => void;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function EventModal({ event, onClose, onUpdated, onDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    client_name: event.client_name,
    title: event.title,
    start_time: event.start_time.slice(0, 16),   // datetime-local format
    end_time: event.end_time ? event.end_time.slice(0, 16) : '',
    location: event.location ?? '',
    notes: event.notes ?? '',
  });

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateEvent(event.id, {
        ...form,
        end_time: form.end_time || null,
        location: form.location || null,
        notes: form.notes || null,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this appointment?')) return;
    setDeleting(true);
    try {
      await deleteEvent(event.id);
      onDeleted(event.id);
    } catch (e) {
      alert((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Color strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ background: event.color }} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ✕
        </button>

        {!editing ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900 pr-8 mt-1">{event.title}</h2>
            <p className="text-sm font-medium mt-1" style={{ color: event.color }}>{event.client_name}</p>

            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <div><span className="font-medium">Start:</span> {fmt(event.start_time)}</div>
              {event.end_time && <div><span className="font-medium">End:</span> {fmt(event.end_time)}</div>}
              {event.location && <div><span className="font-medium">Location:</span> {event.location}</div>}
              {event.notes && <div><span className="font-medium">Notes:</span> {event.notes}</div>}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mt-1 mb-4">Edit Appointment</h2>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-gray-600 font-medium">Client</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-gray-600 font-medium">Title</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-gray-600 font-medium">Start</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-gray-600 font-medium">End (optional)</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-gray-600 font-medium">Location</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-gray-600 font-medium">Notes</span>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
