/**
 * dateUtils.js - Robust Local Date Utilities for AgendaVault.
 * Avoids UTC timezone drift and midnight shifts that break ISO strings in UTC+/- offsets.
 */

/**
 * Format a Date object as YYYY-MM-DD in local time
 * @param {Date} date
 * @returns {string} e.g. "2026-09-15"
 */
export function formatLocalDate(date) {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string into a Date object set at 12:00:00 local time
 * (Noon prevents daylight saving time transitions from changing the date)
 * @param {string|Date} val
 * @returns {Date|null}
 */
export function parseLocalDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const clean = String(val).split('T')[0].trim();
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    return new Date(y, m, d, 12, 0, 0);
  }
  const fallback = new Date(val);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Add or subtract days from a Date safely in local time
 * @param {Date} date
 * @param {number} days
 * @returns {Date}
 */
export function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get start of day (00:00:00) in local time
 * @param {Date} date
 * @returns {Date}
 */
export function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Compare two dates by YYYY-MM-DD
 * @param {Date|string} d1
 * @param {Date|string} d2
 * @returns {boolean}
 */
export function isSameDay(d1, d2) {
  const s1 = typeof d1 === 'string' ? d1.split('T')[0] : formatLocalDate(d1);
  const s2 = typeof d2 === 'string' ? d2.split('T')[0] : formatLocalDate(d2);
  return s1 === s2;
}
