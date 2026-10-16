import { describe, expect, it } from "vitest";
import { logTail, summariseLog } from "./logSummary";

const ref = (level: string, message: string) =>
  `2026-10-12 07:19:49.775 | ${level.padEnd(8)} | climate_ref_core.providers:run:773 - ${message}`;
const esmvaltool = (level: string, message: string) =>
  `2026-09-04 15:02:18,956 UTC [3081509] ${level.padEnd(7)} ${message}`;

const WRAPPER_TRACEBACK = [
  ref("ERROR", "Execution failed"),
  "Traceback (most recent call last):",
  "    result = definition.diagnostic.run(definition=definition)",
  "             │          │                         └ ExecutionDefinition(...)",
  "             │          └ <property object at 0x7f6f2df83a60>",
  "subprocess.CalledProcessError: Command '['micromamba', 'run', 'esmvaltool', 'run']' returned non-zero exit status 1.",
  "climate_ref_core.exceptions.CondaCommandError: Failed to run ['micromamba', 'run', 'esmvaltool', 'run']",
];

describe("summariseLog", () => {
  it("lists errors from the system first and says so", () => {
    const log = [
      ref("INFO", "Running 'micromamba run esmvaltool run'"),
      ref("ERROR", "Failed to run ['micromamba', 'run', 'esmvaltool', 'run']"),
      ref(
        "ERROR",
        'stdout: warning  libmamba Could not create proc dir: "/tmp/cache/mamba/proc" (Permission denied)',
      ),
      "critical libmamba filesystem error: directory iterator cannot open directory: No such file or directory [/tmp/cache/mamba/proc]",
      ref("ERROR", "stderr: None"),
      ...WRAPPER_TRACEBACK,
    ].join("\n");

    expect(summariseLog(log)).toEqual({
      kind: "errors",
      system: true,
      lines: [
        'warning  libmamba Could not create proc dir: "/tmp/cache/mamba/proc" (Permission denied)',
        "critical libmamba filesystem error: directory iterator cannot open directory: No such file or directory [/tmp/cache/mamba/proc]",
      ],
    });
  });

  it("keeps a command killed by a signal, which usually means it ran out of memory", () => {
    const log = [
      ref("ERROR", "Execution failed"),
      "subprocess.CalledProcessError: Command '['micromamba', 'run', 'esmvaltool', 'run']' returned non-zero exit status -9.",
      "climate_ref_core.exceptions.CondaCommandError: Failed to run ['micromamba', 'run', 'esmvaltool', 'run']",
    ].join("\n");

    expect(summariseLog(log)).toEqual({
      kind: "errors",
      system: true,
      lines: [
        "subprocess.CalledProcessError: Command '['micromamba', 'run', 'esmvaltool', 'run']' returned non-zero exit status -9.",
      ],
    });
  });

  it("finds a system error inside an exception", () => {
    const summary = summariseLog(
      [
        ref("INFO", "Writing output"),
        "OSError: [Errno 28] No space left on device: '/scratch/out.nc'",
        "ValueError: Reference intermediate data was not generated.",
      ].join("\n"),
    );

    expect(summary.system).toBe(true);
    expect(summary.lines).toEqual([
      "OSError: [Errno 28] No space left on device: '/scratch/out.nc'",
      "ValueError: Reference intermediate data was not generated.",
    ]);
  });

  it("ignores harmless mamba warnings and dask shutting down", () => {
    const log = [
      ref(
        "ERROR",
        "stdout: warning  libmamba failed to open /home/user/.cache/mamba/proc/2970351.json",
      ),
      esmvaltool(
        "ERROR",
        "Failed to run preprocessor function 'concatenate' on the data",
      ),
      "tornado.iostream.StreamClosedError: Stream is closed",
      "RuntimeError: ConnectionPool is closed",
      "iris.exceptions.ConcatenateError: failed to concatenate into a single cube.",
    ].join("\n");

    expect(summariseLog(log)).toEqual({
      kind: "errors",
      system: false,
      lines: [
        "Failed to run preprocessor function 'concatenate' on the data",
        "iris.exceptions.ConcatenateError: failed to concatenate into a single cube.",
      ],
    });
  });

  it("finds ESMValTool's errors in the captured output", () => {
    const log = [
      ref(
        "ERROR",
        `stdout: ${esmvaltool("INFO", "Starting the Earth System Model Evaluation Tool")}`,
      ),
      esmvaltool("ERROR", "No files were found for Dataset:"),
      "{'diagnostic': 'ecs',",
      " 'dataset': 'AWI-CM-1-1-MR',",
      esmvaltool("ERROR", "Set 'log_level' to 'debug' to get more information"),
      esmvaltool("ERROR", "Missing data for preprocessor ecs/tas:"),
      "- Missing data for Dataset: tas, Amon, CMIP6, AWI-CM-1-1-MR, piControl, r1i1p1f1",
      esmvaltool(
        "ERROR",
        "Program terminated abnormally, see stack trace below for more information:",
      ),
      ...WRAPPER_TRACEBACK,
    ].join("\n");

    expect(summariseLog(log).lines).toEqual([
      "No files were found for Dataset:",
      "Missing data for preprocessor ecs/tas:",
      "- Missing data for Dataset: tas, Amon, CMIP6, AWI-CM-1-1-MR, piControl, r1i1p1f1",
    ]);
  });

  it("finds an error logged in the middle of the log, not only at the end", () => {
    const log = [
      "2026-09-05 07:16:11.334 | INFO     | ilamb3.run:run_single_block:324 - Start of mrro-lora | FGOALS-g3",
      "2026-09-05 07:16:11.516 | ERROR    | ilamb3.run:run_single_block:367 - ILAMB analysis 'mrro-lora' failed for 'FGOALS-g3' when loading the comparison data.",
      "Traceback (most recent call last):",
      "ValueError: Could not find any dimension coordinates to use to order the Dataset objects for concatenation",
      ...Array.from({ length: 50 }, (_, i) => ref("INFO", `step ${i}`)),
      "ValueError: Reference intermediate data was not generated.",
    ].join("\n");

    expect(summariseLog(log).lines).toEqual([
      "ILAMB analysis 'mrro-lora' failed for 'FGOALS-g3' when loading the comparison data.",
      "ValueError: Could not find any dimension coordinates to use to order the Dataset objects for concatenation",
      "ValueError: Reference intermediate data was not generated.",
    ]);
  });

  it("keeps the wrapper exceptions when nothing more specific was logged", () => {
    expect(summariseLog(WRAPPER_TRACEBACK.join("\n")).lines).toEqual([
      "subprocess.CalledProcessError: Command '['micromamba', 'run', 'esmvaltool', 'run']' returned non-zero exit status 1.",
      "climate_ref_core.exceptions.CondaCommandError: Failed to run ['micromamba', 'run', 'esmvaltool', 'run']",
    ]);
  });

  it("falls back to warnings when no error was logged", () => {
    const log = [
      "Converting units by  subtract 273.15",
      "warning: metrics calculation failed for  ICON-ESM-LR r1i1p1f1 There are equal longitude coordinates (when wrapped)!",
      ref("INFO", "Command execution successful"),
      "2026-09-05 00:42:40.818 | WARNING  | climate_ref_pmp.diagnostics.variability_modes:build_execution_result:325 - A single cmec output file not found: []",
      ref("INFO", "Diagnostic execution complete."),
    ].join("\n");

    expect(summariseLog(log)).toEqual({
      kind: "warnings",
      system: false,
      lines: [
        "warning: metrics calculation failed for  ICON-ESM-LR r1i1p1f1 There are equal longitude coordinates (when wrapped)!",
        "A single cmec output file not found: []",
      ],
    });
  });

  it("finds nothing in a log without errors or warnings", () => {
    expect(
      summariseLog([ref("INFO", "Diagnostic execution complete.")].join("\n")),
    ).toEqual({
      kind: "none",
      lines: [],
      system: false,
    });
  });

  it("lists a repeated error once and shortens a long summary", () => {
    const errors = Array.from(
      { length: 40 },
      (_, i) => `ValueError: problem ${i}`,
    );
    const summary = summariseLog([...errors, ...errors].join("\n"), 30);

    expect(summary.lines).toHaveLength(30);
    expect(summary.lines[25]).toBe("…");
    expect(summary.lines.at(-1)).toBe("ValueError: problem 39");
  });
});

describe("logTail", () => {
  it("leaves out loguru's variable annotations", () => {
    const log = [
      "first",
      "    │    └ ExecutionDefinition(...)",
      "last",
      "",
    ].join("\n");
    expect(logTail(log, 20)).toEqual({
      lines: ["first", "last"],
      truncated: false,
    });
  });

  it("keeps the last lines and says when earlier lines were left out", () => {
    const log = Array.from({ length: 25 }, (_, i) => `line ${i}`).join("\n");
    const { lines, truncated } = logTail(log, 20);
    expect(truncated).toBe(true);
    expect(lines[0]).toBe("line 5");
  });
});
