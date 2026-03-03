'use client';

import { useRef, useState } from 'react';
import { addEvents, type Event } from '@/lib/db';

type Props = {
  onSuccess: (events: Event[]) => void;
};

type Mode = 'image' | 'text';

export default function UploadForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('image');
  const [clientName, setClientName] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    setError('');
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      let data: { count: number; events: Event[]; error?: string };

      if (mode === 'image') {
        if (!imageFile) throw new Error('Please select a schedule image');
        const form = new FormData();
        form.append('image', imageFile);
        const res = await fetch('/api/parse-image', { method: 'POST', body: form });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to parse image');
      } else {
        const res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientName: clientName.trim(), scheduleText: scheduleText.trim() }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to parse');
      }

      await addEvents(data.events as Event[]);
      setResult({ count: data.count });
      onSuccess(data.events as Event[]);
      setClientName('');
      setScheduleText('');
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Mode toggle */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium">
        <button
          type="button"
          onClick={() => { setMode('image'); setError(''); setResult(null); }}
          className={`flex-1 py-2.5 transition ${mode === 'image' ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => { setMode('text'); setError(''); setResult(null); }}
          className={`flex-1 py-2.5 transition ${mode === 'text' ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Paste Text
        </button>
      </div>

      {/* Client name — only shown in text mode */}
      {mode === 'text' && (
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
      )}

      {mode === 'image' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Schedule Image (JPG/PNG) <span className="text-red-500">*</span>
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-violet-400 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Schedule preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="text-gray-400 text-sm">
                <div className="text-3xl mb-2">🖼️</div>
                Click to select a schedule image
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          {imageFile && (
            <p className="mt-1.5 text-xs text-gray-500">{imageFile.name}</p>
          )}
          <p className="mt-1.5 text-xs text-gray-400">AI will find April&apos;s shifts and color-code each client automatically.</p>
        </div>
      ) : (
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
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          ✓ Added {result.count} shift{result.count !== 1 ? 's' : ''} to your calendar
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Scanning with AI…' : 'Add Shifts to Calendar'}
      </button>
    </form>
  );
}
