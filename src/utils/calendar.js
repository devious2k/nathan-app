/**
 * Generate and download an .ics calendar file.
 * Works on Android/iOS — opens the native calendar app to add the event.
 */
export function addToCalendar({ title, description, date, time, durationMins = 90 }) {
  const [hours, mins] = time.split(':').map(Number);

  const start = new Date(date);
  start.setHours(hours, mins, 0, 0);

  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nathan Decision Maker//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${title} in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
