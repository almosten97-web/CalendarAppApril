import { NextRequest, NextResponse } from 'next/server';
import { parseScheduleImage } from '@/lib/ai';
import { colorForClient } from '@/lib/colors';
import type { Event } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'image is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const appointments = await parseScheduleImage(base64, mimeType);

    if (appointments.length === 0) {
      return NextResponse.json(
        { error: 'No shifts found for April in the image' },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();

    const events: Event[] = appointments.map((a) => {
      const startISO = `${a.date}T${a.start_time}:00`;

      let endISO: string | null = null;
      if (a.end_time) {
        endISO = `${a.date}T${a.end_time}:00`;
      } else if (a.duration_minutes) {
        const start = new Date(startISO);
        start.setMinutes(start.getMinutes() + a.duration_minutes);
        endISO = start.toISOString();
      }

      // Each client gets its own deterministic color
      const color = colorForClient(a.client_name);

      return {
        id: crypto.randomUUID(),
        client_name: a.client_name,
        title: a.client_name,
        start_time: startISO,
        end_time: endISO,
        location: a.location,
        notes: a.notes,
        raw_text: null,
        color,
        created_at: now,
      };
    });

    return NextResponse.json({ count: events.length, events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[parse-image]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
