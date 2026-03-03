import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ParsedAppointment = {
  date: string;           // YYYY-MM-DD
  start_time: string;     // HH:MM (24h)
  end_time: string | null;
  duration_minutes: number | null;
  location: string | null;
  notes: string | null;
  client_name: string;    // extracted from image, or supplied by caller
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

const IMAGE_PROMPT = `You are a scheduling assistant reading a work roster/schedule image.
The worker is April. Your job is to find every shift assigned to April and record it with the correct CLIENT name.

HOW THIS ROSTER IS STRUCTURED:
- The roster is a calendar grid or table.
- CLIENT names appear as SECTION HEADERS or COLUMN HEADERS at the TOP of each block/column.
- Underneath each client header, rows list which workers are scheduled and at what time.
- April's name ("-April", "April-", or just "April") appears INSIDE the cells under a client header — those are her shifts FOR THAT CLIENT.
- Other names in the same cell (next to or near "-April") are other workers, NOT the client.

So: look UP to the header above the cell containing April's name to find the CLIENT for that shift.

Return ONLY a valid JSON object with an "appointments" array — no markdown, no explanation, no preamble.

Each object must have exactly these fields:
{
  "client_name": "the CLIENT name from the section/column header above April's shift",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM or null",
  "duration_minutes": number_or_null,
  "location": "string or null",
  "notes": "string or null"
}

Rules:
- Extract ALL of April's shifts regardless of month or week.
- If the year is not shown, assume 2026.
- Use 24-hour time. Convert "9am" → "09:00", "1pm" → "13:00".
- Skip days marked OFF, RDO, or where April has no shift.
- Do not include shifts belonging to other workers.
- If the client name cannot be determined, use "Unknown".
- If no shifts found for April, return {"appointments": []}.`;

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
  // Attach the caller-supplied clientName since text mode doesn't extract it from the content
  return parsed.appointments.map((a) => ({ ...a, client_name: clientName }));
}

export async function parseScheduleImage(
  base64Image: string,
  mimeType: string
): Promise<ParsedAppointment[]> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: IMAGE_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  const parsed = JSON.parse(raw) as { appointments: ParsedAppointment[] };
  if (!Array.isArray(parsed.appointments)) throw new Error('Unexpected response format from AI');
  return parsed.appointments;
}
