import { object, type OrcaExecutor, type OrcaExecOptions, type OrcaCommandResult, OrcaBridge, type BridgeState } from "../src/orca.js";
import { emptyInbox, OrcaInbox } from "../src/inbox.js";
export function receipt(result: unknown, ok = true): OrcaCommandResult { return { ok, exitCode: ok ? 0 : 1, stdout: JSON.stringify({ ok, result }), stderr: "", json: { ok, result }, unknownMutation: !ok }; }
export function delivery(id: string | null = null, messages: unknown[] = [], acknowledged: string | null = null) {
  return { runId: "run_test", deliveryId: id, messages, count: messages.length, replayed: false, acknowledged, timedOut: id === null, cancelled: false, connectionLost: false };
}
export function message(id: string, type = "status", body = "fixture") {
  return { id, run_id: "run_test", delivery_contract: "current_delivery", from_handle: "dispatch:ctx_test", to_handle: "run:run_test", subject: "Fixture", body, type, payload: ["question", "worker_done"].includes(type) ? JSON.stringify({ taskId: "task_test", dispatchId: "ctx_test", outcome: "succeeded" }) : null };
}
export function answer(id: string, body = "yes") { return { question: { message_id: id, run_id: "run_test", status: "answered", answer_message_id: "msg_answer", answer_body: body }, message: { id: "msg_answer", run_id: "run_test", thread_id: id, body } }; }
export class FakeExecutor implements OrcaExecutor {
  calls: string[][] = [];
  workers: unknown[] = [];
  tasks: unknown[] = [];
  owner = "term_test";
  pending: ReturnType<typeof delivery> = delivery();
  afterAck: ReturnType<typeof delivery> = delivery();
  cleanup = { dispatch: { id: "ctx_test", run_id: "run_test", status: "completed" }, terminalResource: { ownerDispatchId: "ctx_test", releaseState: "released", ownershipState: "released" } };
  overrides = new Map<string, (args: readonly string[], options: OrcaExecOptions) => Promise<OrcaCommandResult>>();
  aborted = 0;
  taskCounter = 0;
  async run(args: readonly string[], options: OrcaExecOptions): Promise<OrcaCommandResult> {
    this.calls.push([...args]);
    const action = args.slice(0, 2).join(" ");
    const override = this.overrides.get(action);
    if (override) return override(args, options);
    const value = (flag: string) => args[args.indexOf(flag) + 1];
    if (action === "terminal show") return receipt({ terminal: { handle: "term_test", worktreeId: "repo_test::/repo", worktreePath: "/repo", connected: true, agentIdentity: "pi", executionHostId: "local", orphaned: false } });
    if (action === "worktree show") return receipt({ worktree: { id: "repo_test::/repo", repoId: "repo_test", path: "/repo", hostId: "local" } });
    if (action === "orchestration worker-list") return receipt({ workers: this.workers });
    if (["orchestration run-show", "orchestration run-create", "orchestration run-use"].includes(action)) return receipt({ run: { id: "run_test", coordinator_handle: this.owner } });
    if (action === "orchestration task-list") return receipt({ runId: "run_test", tasks: this.tasks });
    if (action === "orchestration task-create") return receipt({ task: { id: `task_${++this.taskCounter}`, run_id: "run_test" } });
    if (action === "orchestration worker-start") return receipt({ runId: "run_test", taskId: value("--task"), dispatchId: `ctx_${value("--task")}`, state: "ready", stage: "input_accepted", setup: { state: "not_configured" }, effects: [{ kind: "worktree", action: "created_top_level", id: `repo_test::/fixture/${value("--name")}` }], residualResources: [] });
    if (action === "orchestration worker-show") return receipt(this.cleanup);
    if (action === "orchestration reply") return receipt(answer(value("--id")!, value("--body")));
    if (action === "orchestration check") {
      if (args.includes("--ack")) return receipt({ ...this.afterAck, acknowledged: value("--ack") });
      if (!args.includes("--wait")) return receipt(this.pending);
      // Controllable abort-aware wait; never endless resolved microtasks.
      return new Promise((resolve) => {
        const abort = () => { this.aborted++; resolve({ ...receipt({}, false), error: "aborted" }); };
        if (options.signal?.aborted) abort(); else options.signal?.addEventListener("abort", abort, { once: true });
      });
    }
    throw new Error(`Unhandled fake ${action}`);
  }
}
export function harness(fake = new FakeExecutor()) {
  const state: BridgeState = { binding: { runId: "run_test", repoId: "repo_test", sessionId: "session_test", cwd: "/repo", terminalHandle: "term_test", cliCommand: "orca-ide", limit: 4, paused: false }, reservations: [] };
  const saved: unknown[] = [], sent: string[] = [], notices: string[] = [];
  const inboxState = emptyInbox();
  const save = () => saved.push(structuredClone({ bridge: state, inbox: inboxState }));
  const bridge = new OrcaBridge(fake, { sessionId: "session_test", cwd: "/repo", terminalHandle: "term_test" }, "orca-ide", state, save);
  const inbox = new OrcaInbox(bridge, inboxState, { save, notify: (s) => notices.push(s), inject: (s) => sent.push(s) });
  return { fake, state, saved, sent, notices, bridge, inbox, inboxState };
}
export function result(value: OrcaCommandResult) { return object(object(value.json).result); }
export const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
