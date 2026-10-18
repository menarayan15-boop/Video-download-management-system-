import crypto from 'crypto';
import { CONFIG } from '../../config/constants.js';

export interface QuotaPeriod {
  start: Date;
  end: Date;
  timezone: string;
}

/**
 * Calculates current quota period boundaries in Asia/Kolkata (or configured timezone).
 * For DAILY quota: from 00:00:00.000 to 23:59:59.999 in that timezone.
 * For MONTHLY quota: from 1st of current month to end of current month.
 */
export function getQuotaPeriod(periodType: 'DAILY' | 'MONTHLY' = 'DAILY', refDate: Date = new Date()): QuotaPeriod {
  const tz = CONFIG.QUOTA_TIMEZONE;

  // Format parts in given timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(refDate);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);

  if (periodType === 'DAILY') {
    // Start of day in target timezone
    // e.g. IST is UTC+5:30 -> 00:00:00 IST is previous day 18:30:00 UTC
    // We construct the ISO string in that timezone offset or compute with Date
    const startStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000+05:30`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999+05:30`;

    return {
      start: new Date(startStr),
      end: new Date(endStr),
      timezone: tz,
    };
  } else {
    // Monthly
    const startStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+05:30`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999+05:30`;

    return {
      start: new Date(startStr),
      end: new Date(endStr),
      timezone: tz,
    };
  }
}

/**
 * Creates SHA-256 hash of idempotency key scoped with user ID to avoid collisions
 */
export function hashIdempotencyKey(userId: string, key: string): string {
  return crypto.createHash('sha256').update(`${userId}:${key.trim()}`).digest('hex');
}
