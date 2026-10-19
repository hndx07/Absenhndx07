// 12 Jam Pelajaran Sesuai Jadwal Resmi Sekolah SMK Muhammadiyah Bawang
export const TEACHING_PERIODS = [
  { no: 1, timeRange: '07:15 - 07:45', start: '07:15', end: '07:45' },
  { no: 2, timeRange: '07:45 - 08:15', start: '07:45', end: '08:15' },
  { no: 3, timeRange: '08:15 - 08:45', start: '08:15', end: '08:45' },
  { no: 4, timeRange: '08:45 - 09:15', start: '08:45', end: '09:15' },
  { no: 5, timeRange: '09:30 - 10:00', start: '09:30', end: '10:00' },
  { no: 6, timeRange: '10:00 - 10:30', start: '10:00', end: '10:30' },
  { no: 7, timeRange: '10:30 - 11:00', start: '10:30', end: '11:00' },
  { no: 8, timeRange: '11:00 - 11:30', start: '11:00', end: '11:30' },
  { no: 9, timeRange: '11:30 - 12:00', start: '11:30', end: '12:00' },
  { no: 10, timeRange: '13:00 - 13:40', start: '13:00', end: '13:40' },
  { no: 11, timeRange: '13:40 - 14:20', start: '13:40', end: '14:20' },
  { no: 12, timeRange: '14:20 - 15:00', start: '14:20', end: '15:00' },
];

export function parseJamKeToPeriods(jamKeStr: string): number[] {
  if (!jamKeStr) return [1, 2, 3, 4];
  const cleaned = jamKeStr.trim();
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map((p) => parseInt(p.trim(), 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const start = Math.min(parts[0], parts[1]);
      const end = Math.max(parts[0], parts[1]);
      const res: number[] = [];
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= 12) res.push(i);
      }
      return res.length > 0 ? res : [1, 2, 3, 4];
    }
  }
  const nums = cleaned.match(/\d+/g);
  if (nums && nums.length > 0) {
    const res = Array.from(new Set(nums.map((n) => parseInt(n, 10)).filter((n) => n >= 1 && n <= 12)));
    return res.length > 0 ? res.sort((a, b) => a - b) : [1, 2, 3, 4];
  }
  return [1, 2, 3, 4];
}

export function formatPeriodsToJamKe(periods: number[]): { jamKe: string; rentangJam: string } {
  if (!periods || periods.length === 0) {
    return { jamKe: '1 - 4', rentangJam: '07:15 - 09:15 WIB' };
  }
  const sorted = Array.from(new Set(periods)).sort((a, b) => a - b);
  let isConsecutive = sorted.length > 1;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] !== sorted[i] + 1) {
      isConsecutive = false;
      break;
    }
  }

  const jamKe = isConsecutive
    ? `${sorted[0]} - ${sorted[sorted.length - 1]}`
    : sorted.join(', ');

  const firstPeriod = TEACHING_PERIODS.find((p) => p.no === sorted[0]);
  const lastPeriod = TEACHING_PERIODS.find((p) => p.no === sorted[sorted.length - 1]);
  const rentangJam = firstPeriod && lastPeriod
    ? `${firstPeriod.start} - ${lastPeriod.end} WIB`
    : '07:15 - 15:00 WIB';

  return { jamKe, rentangJam };
}
