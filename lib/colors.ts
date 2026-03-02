const PALETTE = [
  '#7C3AED', // violet
  '#DB2777', // pink
  '#0891B2', // cyan
  '#D97706', // amber
  '#059669', // emerald
  '#DC2626', // red
  '#2563EB', // blue
  '#7C2D12', // brown
  '#4F46E5', // indigo
  '#0F766E', // teal
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Deterministic: same client name always returns the same color
export function colorForClient(clientName: string): string {
  return PALETTE[hashStr(clientName.trim().toLowerCase()) % PALETTE.length];
}
