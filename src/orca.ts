import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export type RecordValue = Record<string, unknown>;
export function object(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected object in Orca receipt");
  return value as RecordValue;
}
export function text(value: unknown): string {
  if (typeof value !== "string" || !value) throw new Error("Expected nonempty string in Orca receipt");
  return value;
}
export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected array in Orca receipt");
  return value;
}
export function resultOf(value: unknown): RecordValue {
  const envelope = object(value);
  if (envelope.ok !== true) throw new Error("Orca returned a failed envelope");
  return object(envelope.result);
}
export interface OrcaExecOptions {
  cwd: string;
  signal?: AbortSignal | undefined;
  timeoutMs?: number;
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
  mutation?: boolean;
}
export interface OrcaCommandResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  json: unknown;
  error?: string | undefined;
  unknownMutation: boolean;
}
export interface OrcaExecutor {
  run(args: readonly string[], options: OrcaExecOptions): Promise<OrcaCommandResult>;
}
export class OrcaCliError extends Error {
  constructor(message: string, readonly receipt: OrcaCommandResult) {
    super(message);
  }
}
export function resolveOrcaCommand(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string {
  return env.ORCA_CLI_COMMAND || (env.ORCA_DEV_REPO_ROOT ? "orca-dev" : platform === "linux" ? "orca-ide" : "orca");
}
/** No shell, retries, fallback executables, or process-group signals. */
export class OrcaCli implements OrcaExecutor {
  constructor(readonly command = resolveOrcaCommand()) {}
  run(args: readonly string[], options: OrcaExecOptions): Promise<OrcaCommandResult> {
    if (options.signal?.aborted) return Promise.resolve({ ok: false, exitCode: -1, stdout: "", stderr: "", json: undefined, error: "Cancelled before spawn; no effect", unknownMutation: false });
    return new Promise((resolve) => {
      const outLimit = options.maxStdoutBytes ?? 256 * 1024;
      const errLimit = options.maxStderrBytes ?? 32 * 1024;
      let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), error: string | undefined;
      let killTimer: ReturnType<typeof setTimeout> | undefined;
      const child = spawn(this.command, [...args], { cwd: options.cwd, env: process.env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
      const stop = (reason: string): void => {
        if (error) return;
        error = reason;
        child.kill("SIGTERM");
        killTimer = setTimeout(() => child.kill("SIGKILL"), 250);
      };
      const abort = (): void => stop("CLI cancelled; inspect mutation outcome before retrying");
      options.signal?.addEventListener("abort", abort, { once: true });
      if (options.signal?.aborted) abort();
      const timer = setTimeout(() => stop("CLI transport timeout; inspect outcome before retrying"), options.timeoutMs ?? 90000);
      child.stdout.on("data", (chunk: Buffer) => {
        const remaining = Math.max(0, outLimit - stdout.length);
        stdout = Buffer.concat([stdout, chunk.subarray(0, remaining)]);
        if (chunk.length > remaining) stop("stdout exceeded capture bound; response not accepted");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        const remaining = Math.max(0, errLimit - stderr.length);
        stderr = Buffer.concat([stderr, chunk.subarray(0, remaining)]);
        if (chunk.length > remaining) stop("stderr exceeded capture bound; response not accepted");
      });
      child.on("error", (cause) => { error ??= cause.message; });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (killTimer) clearTimeout(killTimer);
        options.signal?.removeEventListener("abort", abort);
        let json: unknown;
        try { json = JSON.parse(stdout.toString("utf8")); } catch { error ??= "Malformed JSON stdout"; }
        try { resultOf(json); } catch (cause) { error ??= String(cause); }
        if (code !== 0) error ??= `CLI exited ${code}`;
        resolve({ ok: !error, exitCode: code ?? -1, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8"), json, error, unknownMutation: Boolean(options.mutation && error) });
      });
    });
  }
}
export interface Identity {
  sessionId: string;
  cwd: string;
  terminalHandle: string;
}
export interface Binding extends Identity {
  runId: string;
  repoId: string;
  cliCommand: string;
  limit: number;
  paused: boolean;
}
export interface Reservation {
  id: string;
  name: string;
  taskId?: string;
  dispatchId?: string;
  worktreeId?: string;
  setupState?: string;
  phase: "task_unknown" | "start_unknown" | "ready";
  receipt?: unknown;
}
export interface BridgeState {
  binding?: Binding;
  reservations: Reservation[];
  recovery?: string;
  receipt?: unknown;
}
export interface DelegateRequest { title: string; specification: string; worktreeName: string; baseRef: string }

/** Session-local controls; state is persisted by Pi, not a second task database. */
export class OrcaBridge {
  private admission: Promise<void> = Promise.resolve();
  readonly controller = new AbortController();
  constructor(
    readonly executor: OrcaExecutor,
    readonly identity: Identity,
    readonly cliCommand: string,
    readonly state: BridgeState,
    readonly persist: () => void,
  ) {}
  stop(): void { this.controller.abort(); }
  alive(): void { this.controller.signal.throwIfAborted(); }
  async call(args: readonly string[], mutation = false, signal?: AbortSignal): Promise<RecordValue> {
    this.alive();
    signal?.throwIfAborted();
    const receipt = await this.executor.run(args, { cwd: this.identity.cwd, mutation, signal: signal ? AbortSignal.any([signal, this.controller.signal]) : this.controller.signal });
    this.alive();
    if (mutation) { this.state.receipt = receipt; this.persist(); }
    if (!receipt.ok) throw new OrcaCliError(`Orca ${args.slice(0, 2).join(" ")} failed; inspect retained receipt, do not retry automatically`, receipt);
    return resultOf(receipt.json);
  }
  async principal(): Promise<string> {
    const handle = text(this.identity.terminalHandle);
    const terminal = object((await this.call(["terminal", "show", "--terminal", handle, "--json"])).terminal);
    if (terminal.handle !== handle || terminal.worktreePath !== this.identity.cwd || terminal.connected !== true || terminal.agentIdentity !== "pi" || terminal.executionHostId !== "local" || terminal.orphaned !== false) throw new Error("Exact live local Pi terminal identity not proven");
    const workers = array((await this.call(["orchestration", "worker-list", "--json"])).workers);
    for (const raw of workers) {
      const worker = object(raw);
      text(worker.dispatchStatus);
      if (worker.agentTerminalHandle === handle && !["completed", "failed", "stopped"].includes(String(worker.dispatchStatus))) throw new Error("Active worker cannot own bridge coordinator controls (including a new Run)");
    }
    const worktree = object((await this.call(["worktree", "show", "--worktree", `path:${this.identity.cwd}`, "--json"])).worktree);
    if (worktree.path !== this.identity.cwd || worktree.hostId !== "local" || terminal.worktreeId !== worktree.id) throw new Error("Exact local repository identity not proven");
    return text(worktree.repoId);
  }
  binding(): Binding {
    const b = this.state.binding;
    if (!b) throw new Error("No bound Run: use /orca start or attach");
    if (b.sessionId !== this.identity.sessionId || b.cwd !== this.identity.cwd || b.terminalHandle !== this.identity.terminalHandle || b.cliCommand !== this.cliCommand) throw new Error("Session/cwd/terminal/executable changed; automatic ownership inheritance refused");
    return b;
  }
  async validate(allowPaused = false): Promise<Binding> {
    const b = this.binding();
    if (b.paused && !allowPaused) throw new Error("Bridge paused; explicit /orca resume required");
    if (await this.principal() !== b.repoId) throw new Error("Repository identity changed");
    const run = object((await this.call(["orchestration", "run-show", "--id", b.runId, "--json"])).run);
    if (run.id !== b.runId || run.coordinator_handle !== b.terminalHandle) throw new Error("Run coordinator ownership lost");
    this.binding();
    if (b.paused && !allowPaused) throw new Error("Bridge paused during authority validation");
    return b;
  }
  async bind(kind: "start" | "attach", value: string): Promise<Binding> {
    if (this.state.binding) throw new Error("Already bound; changing Runs in one bridge session is refused");
    if (this.state.recovery) throw new Error(this.state.recovery);
    const repoId = await this.principal();
    if (kind === "attach") {
      const prior = object((await this.call(["orchestration", "run-show", "--id", value, "--json"])).run);
      if (prior.id !== value || prior.coordinator_handle !== this.identity.terminalHandle) throw new Error("Attach refused: Run is not owned by exact invoking terminal; no takeover");
    }
    this.state.recovery = `${kind} outcome may be unknown; inspect Run receipts before another binding mutation`;
    this.persist();
    const receipt = await this.call(kind === "start" ? ["orchestration", "run-create", "--objective", value, "--json"] : ["orchestration", "run-use", "--id", value, "--json"], true);
    const run = object(receipt.run);
    const runId = text(run.id);
    if ((kind === "attach" && runId !== value) || run.coordinator_handle !== this.identity.terminalHandle) throw new Error("Run binding response has wrong identity");
    this.state.binding = { ...this.identity, runId, repoId, cliCommand: this.cliCommand, limit: 4, paused: true };
    delete this.state.recovery;
    this.persist();
    return this.state.binding;
  }
  async delegate(request: DelegateRequest, signal?: AbortSignal): Promise<Reservation> {
    signal?.throwIfAborted();
    if (!request.title.trim() || request.title.length > 160 || !request.specification.trim() || request.specification.length > 20000 || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(request.worktreeName) || !request.baseRef || request.baseRef.startsWith("-") || request.baseRef.length > 200) throw new Error("Invalid bounded task/name/base ref");
    // Only admission/reconciliation is serialized; the four owned launch attempts can overlap.
    let unlock!: () => void;
    const previous = this.admission;
    this.admission = new Promise<void>((resolve) => { unlock = resolve; });
    await previous;
    let reservation: Reservation;
    let b: Binding;
    try {
      b = await this.validate();
      const tasksReceipt = await this.call(["orchestration", "task-list", "--run", b.runId, "--brief", "--json"]);
      if (tasksReceipt.runId !== b.runId) throw new Error("Wrong Run task reconciliation");
      const tasks = array(tasksReceipt.tasks).map(object);
      for (const task of tasks) if (task.run_id !== b.runId || !["ready", "pending", "dispatched", "completed", "failed", "blocked"].includes(text(task.status))) throw new Error("Malformed authoritative task state");
      this.state.reservations = this.state.reservations.filter((r) => !r.taskId || !tasks.some((t) => t.id === r.taskId && ["completed", "failed"].includes(String(t.status))));
      if (this.state.reservations.some((r) => r.name === request.worktreeName)) throw new Error("Name already reserved; inspect existing Task/Dispatch, do not recreate");
      const occupied = new Set(tasks.filter((t) => t.status === "dispatched").map((t) => text(t.id)));
      for (const r of this.state.reservations) occupied.add(r.taskId ?? r.id);
      if (occupied.size >= b.limit) throw new Error(`Capacity ${b.limit} reached; no hidden launch queue`);
      reservation = { id: randomUUID(), name: request.worktreeName, phase: "task_unknown" };
      this.state.reservations.push(reservation);
      this.persist(); // write intent before any mutation; crash leaves occupied slot
    } finally { unlock(); }
    try {
      await this.validate();
      const taskResult = await this.call(["orchestration", "task-create", "--run", b.runId, "--spec", `${request.title}\n\n${request.specification}\n\nSelected base ref: ${request.baseRef}\nNo recursive workers. Use the injected Orca lifecycle contract.`, "--json"], true, signal);
      const task = object(taskResult.task);
      if (task.run_id !== b.runId) throw new Error("Wrong Run task creation receipt");
      reservation.taskId = text(task.id);
      reservation.phase = "start_unknown";
      reservation.receipt = taskResult;
      this.persist();
      await this.validate();
      const start = await this.call(["orchestration", "worker-start", "--run", b.runId, "--task", reservation.taskId, "--worktree", "new-top-level", "--repo", `id:${b.repoId}`, "--base-branch", request.baseRef, "--name", request.worktreeName, "--agent", "pi", "--setup", "run", "--json"], true, signal);
      reservation.receipt = start;
      this.persist();
      if (start.runId !== b.runId || start.taskId !== reservation.taskId || start.state !== "ready" || start.stage !== "input_accepted") throw new Error("Worker start failed/unknown or wrong identity; inspect existing receipt");
      const setupState = text(object(start.setup).state);
      const effects = array(start.effects).map(object);
      const worktree = effects.find((e) => e.kind === "worktree" && e.action === "created_top_level" && text(e.id).startsWith(`${b.repoId}::`));
      if (!worktree) throw new Error("Missing exact repo worktree effect");
      reservation.worktreeId = text(worktree.id);
      reservation.setupState = setupState;
      reservation.dispatchId = text(start.dispatchId);
      reservation.phase = "ready";
      this.persist();
      return reservation;
    } catch (error) {
      if (!this.controller.signal.aborted) {
        if (error instanceof OrcaCliError) reservation.receipt = error.receipt;
        this.persist();
      }
      throw error;
    }
  }
}
