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

const IMAGE_PROMPT = `You are a scheduling assistant reading a work roster/schedule image.
Your job is to find every shift assigned to the employee named CLIENT_NAME and extract it.

The employee name may appear in various formats on the roster, such as:
- "CLIENT_NAME" in a row or column header
- "-CLIENT_NAME" or "CLIENT_NAME-" alongside a time slot
- A cell in a grid that contains both a time and "CLIENT_NAME"

Return ONLY a valid JSON object with an "appointments" array — no markdown, no explanation, no preamble.

Each object must have exactly these fields:
{
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM or null",
  "duration_minutes": number_or_null,
  "location": "string or null",
  "notes": "string or null"
}

Rules:
- Extract ALL shifts for CLIENT_NAME regardless of which month or week they fall in.
- If the year is not shown, assume 2026.
- Use 24-hour time. Convert "9am" → "09:00", "1pm" → "13:00".
- Skip days marked OFF, RDO, or with no time for CLIENT_NAME.
- If no shifts are found for CLIENT_NAME, return {"appointments": []}. Do not include shifts for other employees.`;

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

export async function parseScheduleImage(
  clientName: string,
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
            text: IMAGE_PROMPT.replaceAll('CLIENT_NAME', clientName),
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
