/**
 * Formats a duration in seconds as a short human readable string.
 *
 * Sub-minute values keep one decimal, longer values use the two largest units.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "—";
  }
  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`;
  }
  const whole = Math.round(seconds);
  if (whole < 60) {
    return `${whole}s`;
  }
  const totalMinutes = Math.floor(whole / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m ${whole % 60}s`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours}h ${totalMinutes % 60}m`;
  }
  return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
}

const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB"];

/**
 * Formats a byte count using binary units, keeping one decimal above a kibibyte.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) {
    return "—";
  }
  let value = bytes;
  let unit = 0;
  // Step up while the rounded value would still print as 1024.0
  while (value >= 1023.95 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
}

/**
 * Formats a count, using the same missing marker as the other helpers.
 */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString();
}

/**
 * Formats CPU seconds as a count of core hours, the unit used for compute allocation.
 */
export function formatCoreHours(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "—";
  }
  const hours = seconds / 3600;
  const digits = hours < 10 ? 1 : 0;
  return hours.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
