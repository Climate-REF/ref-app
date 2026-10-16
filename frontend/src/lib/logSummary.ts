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
/** The raised exception, at the start of a line, e.g. "ValueError: message" */
const EXCEPTION = /^[A-Za-z_][\w.]*(?:Error|Exception|Exit)(?::|$)/;
/** Errors a provider's command printed without either log format, e.g. PMP's "ERROR File ..." */
const PROVIDER_ERROR = /^ERROR\b/;
/** PMP reports a failed metric as a warning and carries on */
const PROVIDER_WARNING = /^warning: metrics calculation failed\b/;
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
  /returned non-zero exit status -\d+/,
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
  /^climate_ref_core\.exceptions\.CondaCommandError: Failed to run /,
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

export function summariseLog(text: string, maxLines = 30): LogSummary {
  const lines = text.split("\n").map((line) => line.trimEnd());
  const system: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  /** An ESMValTool error, with the lines continuing it when it ends with ":" */
  const addProviderError = (message: string, index: number) => {
    const trimmed = message.trim();
    if (isBoilerplate(trimmed)) {
      return;
    }
    errors.push(trimmed);
    if (!trimmed.endsWith(":")) {
      return;
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
      errors.push(next.trim());
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || ANNOTATION.test(line)) {
      continue;
    }

    const ref = REF_LINE.exec(line);
    // What the line says, without climate-ref's prefix or the label of captured output
    const message = (ref ? ref[2] : line).replace(CAPTURED_OUTPUT, "").trim();
    if (isSystemError(message)) {
      system.push(message);
      continue;
    }

    if (ref) {
      const [, level, raw] = ref;
      if (CAPTURED_OUTPUT.test(raw)) {
        const esmvaltool = ESMVALTOOL_LINE.exec(message);
        if (esmvaltool && isErrorLevel(esmvaltool[1])) {
          addProviderError(esmvaltool[2], i);
        } else if (PROVIDER_ERROR.test(message)) {
          errors.push(message);
        }
      } else if (isErrorLevel(level) && !isBoilerplate(raw)) {
        errors.push(raw);
      } else if (level === "WARNING") {
        warnings.push(raw);
      }
      continue;
    }

    const esmvaltool = ESMVALTOOL_LINE.exec(line);
    if (esmvaltool) {
      if (isErrorLevel(esmvaltool[1])) {
        addProviderError(esmvaltool[2], i);
      }
    } else if (EXCEPTION.test(message) || PROVIDER_ERROR.test(message)) {
      errors.push(message);
    } else if (PROVIDER_WARNING.test(message)) {
      warnings.push(message);
    }
  }

  const unique = (found: string[]) => [...new Set(found.map(clip))];
  const shorten = (found: string[]) =>
    found.length > maxLines
      ? [...found.slice(0, maxLines - 5), "…", ...found.slice(-4)]
      : found;

  // Keep the errors that only follow from another one when they are all there is
  const specific = errors.filter(
    (line) => !SECONDARY.some((pattern) => pattern.test(line)),
  );
  const found = [
    ...system,
    ...(specific.length > 0 || system.length > 0 ? specific : errors),
  ];
  if (found.length > 0) {
    return {
      kind: "errors",
      lines: shorten(unique(found)),
      system: system.length > 0,
    };
  }
  if (warnings.length > 0) {
    return {
      kind: "warnings",
      lines: shorten(unique(warnings)),
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
