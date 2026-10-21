/**
 * Pick the lines of an execution log that explain why it failed
 *
 * The end of a failed log is mostly the traceback of the wrapper that ran the provider,
 * with loguru's variable annotations, while the cause can be anywhere:
 * an ERROR message from climate-ref or the provider, the exception that was raised,
 * a line the provider printed, or an error from the system the provider ran on.
 */

/** What the summary found */
export type LogSummaryKind = "errors" | "warnings" | "none";

export interface LogSummary {
  kind: LogSummaryKind;
  lines: string[];
  /**
   * Whether the log reports an error from the system rather than the diagnostic,
   * such as a broken conda environment, a full disk or a process killed for using too much memory.
   * Those lines come first.
   */
  system: boolean;
}

/** A climate-ref log line, e.g. "2026-09-04 15:02:18.111 | ERROR    | climate_ref_core.providers:run:772 - message" */
const REF_LINE =
  /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+ \| (\w+)\s*\| \S+ - (.*)$/;
/** An ESMValTool log line, e.g. "2026-09-04 15:02:18,956 UTC [3081509] ERROR   message" */
const ESMVALTOOL_LINE =
  /\d{4}-\d\d-\d\d \d\d:\d\d:\d\d,\d+ UTC \[\d+\] (\w+)\s+(.*)$/;
/**
 * A line in Python's standard logging format, as dask and other libraries print it,
 * e.g. "2026-10-17 11:18:28,537 - distributed.scheduler - ERROR - message"
 */
const STANDARD_LINE =
  /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d,\d+ - \S+ - (DEBUG|INFO|WARNING|ERROR|CRITICAL) - /;
/** The raised exception, at the start of a line, e.g. "ValueError: message" */
const EXCEPTION = /^[A-Za-z_][\w.]*(?:Error|Exception|Exit)(?::|$)/;
/** Errors a provider's command printed without either log format, e.g. PMP's "ERROR File ..." */
const PROVIDER_ERROR = /^ERROR\b/;
/** PMP reports a failed metric as a warning and carries on */
const PROVIDER_WARNING = /^warning: metrics calculation failed\b/;
/**
 * climate-ref's own record of why the execution failed, appended to the log since climate-ref 0.19,
 * e.g. "REF: execution failed (system_error): the diagnostic reported failure"
 */
const REF_FAILURE = /^REF: execution failed \(([\w-]+)\): /;
/** loguru's variable annotations in tracebacks, e.g. "    │    └ ExecutionDefinition(...)" */
const ANNOTATION = /^\s*[│└├]/;
/** The provider's captured output, logged by climate-ref after "stdout: " or "stderr: " */
const CAPTURED_OUTPUT = /^(?:stdout|stderr): /;

/**
 * Errors from the system the provider runs on, rather than from the diagnostic
 *
 * Whichever program hits one prints it in its own format, so they are matched anywhere in a line.
 */
const SYSTEM_ERRORS = [
  // conda and mamba's own error levels, e.g. "critical libmamba filesystem error: ..."
  /^(?:critical|error)\s+(?:libmamba|mamba|conda)\b/,
  /Permission denied/,
  /No space left on device|Disk quota exceeded|Read-only file system/,
  /Too many open files/,
  /Cannot allocate memory|Out of memory|oom-kill|OOMKilled/i,
  /^Killed$|Segmentation fault|Bus error|core dumped/,
  // A command killed by a signal, e.g. -9 when it was killed for using too much memory
  /(?:returned non-zero exit status|exited with code) -\d+/,
  // dask restarting workers that ran out of memory, and giving up on their task
  /exceeded \d+% memory budget/,
  /workers? died while trying to run it/,
  /\bKilledWorker\b/,
  /: command not found$/,
  /Connection refused|Name or service not known|Temporary failure in name resolution|Network is unreachable/,
];

/** Messages that are logged for every failure, so say nothing about this one */
const BOILERPLATE = [
  /^Execution failed$/,
  /^stderr: None$/,
  /^Program terminated abnormally, see stack trace below/,
  /^If you have a question or need help/,
  /^Set 'log_level' to 'debug' to get more information/,
  /^Resulting cubes:$/,
  /^Failed to run \[/,
  /^Command output:$/,
  /^Command exited with code \d+: /,
  /^If the files are available, please check the debug log/,
  /^To see your current configuration, run the command/,
  /^To see the available example configurations, run the command/,
];

/**
 * Errors that follow from another one, kept only when nothing more specific was found:
 * the exceptions of the code that ran the provider, which only repeat that its command failed,
 * and dask's scheduler shutting down after a task failed
 */
const SECONDARY = [
  /^subprocess\.CalledProcessError: Command /,
  /^climate_ref_core\.exceptions\.CondaCommandError: /,
  /^(?:[\w.]+\.)?(?:StreamClosedError|CommClosedError|BrokenPipeError)\b/,
  /ConnectionPool is closed/,
];

const isBoilerplate = (message: string) =>
  BOILERPLATE.some((pattern) => pattern.test(message));

const isSystemError = (message: string) =>
  SYSTEM_ERRORS.some((pattern) => pattern.test(message));

const isErrorLevel = (level: string) =>
  level === "ERROR" || level === "CRITICAL";

const MAX_LINE_LENGTH = 400;
const clip = (line: string) =>
  line.length > MAX_LINE_LENGTH ? `${line.slice(0, MAX_LINE_LENGTH)}…` : line;

/** Lines continuing an error message that ends with ":", such as the dataset ESMValTool could not find */
const CONTINUATION_LINES = 6;

/**
 * Where a line belongs in the summary: climate-ref's record of the failure,
 * an error from the system, an error from the diagnostic, or a warning
 */
type Kind = "recorded" | "system" | "errors" | "warnings";
type Classified = { kind: Kind; lines: string[] } | undefined;

const classified = (kind: Kind, ...lines: string[]): Classified => ({
  kind,
  lines,
});

const byLevel = (level: string, line: string): Classified => {
  if (isErrorLevel(level)) {
    return classified("errors", line);
  }
  return level === "WARNING" ? classified("warnings", line) : undefined;
};

/** An ESMValTool error, with the lines continuing it when it ends with ":" */
function providerError(
  message: string,
  lines: string[],
  index: number,
): Classified {
  const trimmed = message.trim();
  if (isBoilerplate(trimmed)) {
    return undefined;
  }
  const found = [trimmed];
  if (!trimmed.endsWith(":")) {
    return classified("errors", ...found);
  }
  for (
    let k = index + 1;
    k <= index + CONTINUATION_LINES && k < lines.length;
    k++
  ) {
    const next = lines[k];
    // A dict or list printed after the message is too verbose to be useful here
    if (
      !next.trim() ||
      REF_LINE.test(next) ||
      ESMVALTOOL_LINE.test(next) ||
      /^\s*[{[]/.test(next)
    ) {
      break;
    }
    found.push(next.trim());
  }
  return classified("errors", ...found);
}

/** A message climate-ref logged, either its own or the provider's captured output */
function classifyRefMessage(
  level: string,
  raw: string,
  message: string,
  lines: string[],
  index: number,
): Classified {
  if (CAPTURED_OUTPUT.test(raw)) {
    const esmvaltool = ESMVALTOOL_LINE.exec(message);
    if (esmvaltool && isErrorLevel(esmvaltool[1])) {
      return providerError(esmvaltool[2], lines, index);
    }
    return PROVIDER_ERROR.test(message)
      ? classified("errors", message)
      : undefined;
  }
  if (isErrorLevel(level)) {
    return isBoilerplate(raw) ? undefined : classified("errors", raw);
  }
  return level === "WARNING" ? classified("warnings", raw) : undefined;
}

/** A line printed outside climate-ref's log format */
function classifyOtherLine(
  line: string,
  message: string,
  lines: string[],
  index: number,
): Classified {
  const esmvaltool = ESMVALTOOL_LINE.exec(line);
  if (esmvaltool) {
    return isErrorLevel(esmvaltool[1])
      ? providerError(esmvaltool[2], lines, index)
      : undefined;
  }
  if (EXCEPTION.test(message) || PROVIDER_ERROR.test(message)) {
    return classified("errors", message);
  }
  return PROVIDER_WARNING.test(message)
    ? classified("warnings", message)
    : undefined;
}

function classifyLine(lines: string[], index: number): Classified {
  const line = lines[index];
  if (!line.trim() || ANNOTATION.test(line)) {
    return undefined;
  }
  if (REF_FAILURE.test(line)) {
    return classified("recorded", line.trim());
  }

  const ref = REF_LINE.exec(line);
  // What the line says, without climate-ref's prefix or the label of captured output
  const message = (ref ? ref[2] : line).replace(CAPTURED_OUTPUT, "").trim();
  if (isSystemError(message)) {
    return classified("system", message);
  }

  // Kept whole, as its timestamp places it relative to the failure
  const standard = STANDARD_LINE.exec(line);
  if (standard) {
    return byLevel(standard[1], line);
  }
  if (ref) {
    return classifyRefMessage(ref[1], ref[2], message, lines, index);
  }
  return classifyOtherLine(line, message, lines, index);
}

const unique = (found: string[]) => [...new Set(found.map(clip))];

/**
 * A system error repeated with different numbers (a worker's address, a process id) is one problem,
 * so only its most recent occurrence is kept
 */
function latestOfEach(found: string[]) {
  const byShape = new Map<string, string>();
  for (const line of found) {
    const shape = line.replace(/\d+/g, "#");
    byShape.delete(shape);
    byShape.set(shape, line);
  }
  return [...byShape.values()];
}

const shorten = (found: string[], maxLines: number) =>
  found.length > maxLines
    ? [...found.slice(0, maxLines - 5), "…", ...found.slice(-4)]
    : found;

export function summariseLog(text: string, maxLines = 30): LogSummary {
  const lines = text.split("\n").map((line) => line.trimEnd());
  const found: Record<Kind, string[]> = {
    recorded: [],
    system: [],
    errors: [],
    warnings: [],
  };
  for (let i = 0; i < lines.length; i++) {
    const result = classifyLine(lines, i);
    if (result) {
      found[result.kind].push(...result.lines);
    }
  }
  const { recorded, system, errors, warnings } = found;

  // Keep the errors that only follow from another one when they are all there is
  const specific = errors.filter(
    (line) => !SECONDARY.some((pattern) => pattern.test(line)),
  );
  const all = [
    ...recorded,
    ...latestOfEach(system),
    ...(specific.length > 0 || system.length > 0 ? specific : errors),
  ];
  if (all.length > 0) {
    return {
      kind: "errors",
      lines: shorten(unique(all), maxLines),
      system:
        system.length > 0 ||
        recorded.some((line) => REF_FAILURE.exec(line)?.[1] === "system_error"),
    };
  }
  if (warnings.length > 0) {
    return {
      kind: "warnings",
      lines: shorten(unique(warnings), maxLines),
      system: false,
    };
  }
  return { kind: "none", lines: [], system: false };
}

/** The last lines of a log, without loguru's variable annotations, and whether earlier lines were left out */
export function logTail(
  text: string,
  limit: number,
): { lines: string[]; truncated: boolean } {
  const lines = text.split("\n").filter((line) => !ANNOTATION.test(line));
  // Drop the empty string after the final line ending
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return { lines: lines.slice(-limit), truncated: lines.length > limit };
}
