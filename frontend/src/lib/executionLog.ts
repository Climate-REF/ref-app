/** One record of an execution log, or a stretch of text outside the log format with no timestamp or level. */
export interface LogMessage {
  timestamp: string | null;
  level: string | null;
  message: string;
}

/** Where a loguru record starts, e.g. "2026-09-04 15:02:18.111" */
const RECORD_START = /(?=\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/g;
/** A loguru record, e.g. "2026-09-04 15:02:18.111 | ERROR    | module:function:772 - message", whose message may span lines */
const RECORD = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \| (\w+) +\|(.*)/s;

/**
 * Split an execution log into its records
 *
 * A record runs until the next timestamp, so lines continuing a message, such as a traceback, stay with it.
 * Text that does not parse as a record is kept as a message without a timestamp or level.
 */
export function parseLogOutput(logOutput: string): LogMessage[] {
  const parsed: LogMessage[] = [];
  for (const chunk of logOutput.split(RECORD_START)) {
    const trimmed = chunk.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(RECORD);
    parsed.push(
      match
        ? { timestamp: match[1], level: match[2], message: match[3].trim() }
        : { timestamp: null, level: null, message: trimmed },
    );
  }
  return parsed;
}

/** A level to narrow the log to, with `all` for every message */
export type LogLevelFilter = "all" | "debug" | "info" | "warning" | "error";

/** The messages at `level` whose message or timestamp contains `term`, ignoring case in the message. */
export function filterLogs(
  logs: LogMessage[],
  level: LogLevelFilter,
  term: string,
): LogMessage[] {
  const lowerTerm = term.toLowerCase();
  return logs.filter(
    (log) =>
      (level === "all" || log.level?.toLowerCase() === level) &&
      (log.message.toLowerCase().includes(lowerTerm) ||
        log.timestamp?.includes(term)),
  );
}

/** The badge colours for a log level. */
export function levelClass(level: string | null): string {
  switch (level) {
    case "DEBUG":
      return "bg-green-500/10 text-green-500";
    case "INFO":
      return "bg-blue-500/10 text-blue-500";
    case "WARNING":
      return "bg-yellow-500/10 text-yellow-500";
    default:
      return "bg-red-500/10 text-red-500";
  }
}
