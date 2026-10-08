// Format a Date in Eastern time for CSV exports.
//
// Intl handles the EST/EDT switch (and the exact DST boundary dates) from the
// IANA database, so there are no month/day rules to maintain here. The zone
// abbreviation is appended so a reader can always tell which offset applied —
// without it, the hour repeated on the November fall-back night is ambiguous.
//
// Milliseconds are included because gaze samples arrive ~25 times a second:
// aligning them to video events or to a screen recording needs sub-second
// precision, and a truncated timestamp silently loses it.

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: false,
  timeZoneName: 'short',
});

/**
 * @param {Date|null|undefined} date
 * @returns {string} e.g. "2026-10-01 14:23:11.482 EDT", or '' when date is absent
 */
function toEastern(date) {
  if (!date) return '';
  const p = Object.fromEntries(
    FORMATTER.formatToParts(date).map((part) => [part.type, part.value])
  );
  // 'hour' can come back as '24' for midnight under hour12:false in some runtimes.
  const hour = p.hour === '24' ? '00' : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}.${p.fractionalSecond} ${p.timeZoneName}`;
}

module.exports = { toEastern };
