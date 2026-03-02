import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ParsedAppointment = {
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:MM (24h)
  end_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
};

const SYSTEM_PROMPT = `You are a scheduling assistant. Extract every appointment from the schedule text below.
Return ONLY a valid JSON array — no markdown, no explanation, no preamble.

Each object in the array must have exactly these fields:
{
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM or null",
  "duration_minutes": number_or_null,
  "location": "string or null",
  "notes": "string or null"
}

Use 24-hour time format. If year is not specified, assume the current or next upcoming occurrence of that date.`;

export async function parseScheduleText(
  clientName: string,
  scheduleText: string
): Promise<ParsedAppointment[]> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n\nWrap the array in a JSON object: {"appointments": [...]}' },
      { role: 'user', content: `Client: ${clientName}\n\nSchedule:\n${scheduleText}` },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  const parsed = JSON.parse(raw) as { appointments: ParsedAppointment[] };

  if (!Array.isArray(parsed.appointments)) throw new Error('Unexpected response format from AI');
  return parsed.appointments;
}
