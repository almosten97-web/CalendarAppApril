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

const IMAGE_PROMPT = `You are a scheduling assistant reading a monthly work schedule image.

HOW THIS SCHEDULE IS STRUCTURED:
- This is a single client's monthly roster/calendar.
- The CLIENT name appears as the TITLE or HEADER at the very top of the image.
- The schedule shows a full month with dates and which workers are assigned each day.
- April is the worker. Her shifts are marked "-April", "April-", or just "April" in the date cells.
- Other names in the cells are co-workers on the same day, NOT additional clients.

STEP 1: Read the client name from the top of the image.
STEP 2: Find every date cell that contains April's name and extract the shift time.
STEP 3: Apply that same client name to every one of April's shifts.

Return ONLY a valid JSON object with this exact shape — no markdown, no explanation:
{
  "client_name": "the name from the top of the schedule",
  "appointments": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM or null",
      "duration_minutes": number_or_null,
      "location": null,
      "notes": "any extra info in the cell, or null"
    }
  ]
}

Rules:
- All appointments share the same client_name taken from the top of the image.
- If the year is not shown, assume 2026.
- Use 24-hour time. Convert "9am" → "09:00", "1pm" → "13:00".
- Skip days where April is OFF, RDO, or not listed.
- If the client name cannot be read, use "Unknown".
- If no shifts found for April, return {"client_name": "Unknown", "appointments": []}.`;

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
  const parsed = JSON.parse(raw) as { client_name: string; appointments: Omit<ParsedAppointment, 'client_name'>[] };
  if (!Array.isArray(parsed.appointments)) throw new Error('Unexpected response format from AI');
  const clientName = parsed.client_name?.trim() || 'Unknown';
  return parsed.appointments.map((a) => ({ ...a, client_name: clientName }));
}
