'use client';

import { useState } from 'react';
import { addEvents, type Event } from '@/lib/db';

type Props = {
  onSuccess: (events: Event[]) => void;
};

export default function UploadForm({ onSuccess }: Props) {
  const [clientName, setClientName] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ count: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: clientName.trim(), scheduleText: scheduleText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse');

      await addEvents(data.events as Event[]);
      setResult({ count: data.count });
      onSuccess(data.events as Event[]);
      setClientName('');
      setScheduleText('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Client Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Sarah Johnson"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Schedule Text <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          placeholder="Paste the client's schedule message here…"
          value={scheduleText}
          onChange={(e) => setScheduleText(e.target.value)}
          rows={8}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none font-mono"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          ✓ Added {result.count} appointment{result.count !== 1 ? 's' : ''} to your calendar
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Parsing with AI…' : 'Add to Calendar'}
      </button>
    </form>
  );
}
