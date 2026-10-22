// A game's times in the game's own time zone, so a host in Zurich can set up
// a race in London by London's clock. Stored times are moments (milliseconds);
// only showing and typing them depends on a zone. Players' countdowns never
// do. Built on the browser's own time zone data, no library.

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Games set up before they had a zone are read in the host's own
export const gameTimeZone = game => game?.timeZone || browserTimeZone();

export const TIME_ZONES = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : [browserTimeZone()];

// The wall clock in a zone at a moment
function wallClock(ms, zone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(ms).map(p => [p.type, p.value]),
  );
  return parts;
}

// How far a zone's clock runs ahead of UTC at a moment
function offsetAt(ms, zone) {
  const p = wallClock(ms, zone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// A moment as the date field shows it: "2026-10-24T09:30"
export function toZonedInput(ms, zone) {
  const p = wallClock(ms, zone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// What the date field holds, read by the zone's clock. The offset is looked
// up twice, so a time near a clock change lands on the right side of it.
export function fromZonedInput(value, zone) {
  const [date, time] = value.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ms = guess - offsetAt(guess, zone);
  ms = guess - offsetAt(ms, zone);
  return ms;
}

// A moment for reading, in the zone: "24 Oct 2026, 09:30"
export function formatInZone(ms, zone) {
  return new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', timeZone: zone });
}
