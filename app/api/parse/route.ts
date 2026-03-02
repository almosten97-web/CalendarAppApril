import { NextRequest, NextResponse } from 'next/server';
import { parseScheduleText } from '@/lib/ai';
import { colorForClient } from '@/lib/colors';
import type { Event } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { clientName, scheduleText } = await req.json();

    if (!clientName?.trim() || !scheduleText?.trim()) {
      return NextResponse.json(
        { error: 'clientName and scheduleText are required' },
        { status: 400 }
      );
    }

    const appointments = await parseScheduleText(clientName.trim(), scheduleText.trim());

    if (appointments.length === 0) {
      return NextResponse.json({ error: 'No appointments found in that text' }, { status: 422 });
    }

    const color = colorForClient(clientName);
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

      return {
        id: crypto.randomUUID(),
        client_name: clientName.trim(),
        title: `${clientName.trim()}${a.notes ? ` — ${a.notes.slice(0, 40)}` : ''}`,
        start_time: startISO,
        end_time: endISO,
        location: a.location,
        notes: a.notes,
        raw_text: scheduleText.trim(),
        color,
        created_at: now,
      };
    });

    return NextResponse.json({ count: events.length, events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[parse]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
