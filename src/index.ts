import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { object, OrcaBridge, OrcaCli, resolveOrcaCommand, type BridgeState, type OrcaExecutor } from "./orca.js";
import { emptyInbox, OrcaInbox, type InboxState } from "./inbox.js";

interface Snapshot { version: 1; bridge: BridgeState; inbox: InboxState }
const ENTRY = "pi-orca-v1";

/** Dependencies are injectable only for provider-free lifecycle tests, never exposed as tool arguments. */
export function install(pi: ExtensionAPI, executor?: OrcaExecutor, terminalHandle = process.env.ORCA_TERMINAL_HANDLE ?? ""): void {
  let bridge: OrcaBridge | undefined;
  let inbox: OrcaInbox | undefined;
  let state: Snapshot = { version: 1, bridge: { reservations: [] }, inbox: emptyInbox() };
  let context: ExtensionContext | undefined;
  let live = false;
  let commandBusy = false;
  const executable = resolveOrcaCommand();
  const save = (): void => {
    if (!live) return;
    pi.appendEntry(ENTRY, structuredClone(state));
  };
  const notice = (message: string): void => {
    if (live && context?.hasUI) {
      context.ui.setStatus("orca", state.bridge.binding ? `orca:${state.bridge.binding.runId}${state.bridge.binding.paused ? " paused" : ""}` : "orca:detached");
      context.ui.notify(message.slice(0, 2000), "info");
    }
  };
  const requireBridge = (ctx: ExtensionContext): OrcaBridge => {
    if (!bridge || !live || ctx.sessionManager.getSessionId() !== bridge.identity.sessionId || ctx.cwd !== bridge.identity.cwd) throw new Error("Bridge session replaced/detached");
    return bridge;
  };
  pi.on("session_start", async (event, ctx) => {
    live = true;
    context = ctx;
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && entry.customType === ENTRY) {
        const candidate = object(entry.data);
        if (candidate.version !== 1) throw new Error("Unknown Orca checkpoint version");
        state = structuredClone(candidate) as unknown as Snapshot;
      }
    }
    bridge = new OrcaBridge(executor ?? new OrcaCli(executable), { sessionId: ctx.sessionManager.getSessionId(), cwd: ctx.cwd, terminalHandle }, executable, state.bridge, save);
    inbox = new OrcaInbox(bridge, state.inbox, {
      save, notify: notice,
      inject: (content, deliveryId) => {
        if (!live) return;
        pi.sendMessage({ customType: "orca-inbox", content, display: true, details: { deliveryId } }, { triggerTurn: true, deliverAs: "followUp" });
      },
    });
    if (!state.bridge.binding) { notice("Orca detached; no Run or listener started"); return; }
    const b = state.bridge.binding;
    if (event.reason === "fork" || event.reason === "new" || b.sessionId !== ctx.sessionManager.getSessionId() || b.cwd !== ctx.cwd || b.terminalHandle !== terminalHandle || b.cliCommand !== executable) {
      b.paused = true;
      save();
      notice("Orca ownership inheritance refused; inherited checkpoint is read-only in this session");
      return;
    }
    // Reload/start/resume must prove live authority; persisted pause remains an explicit pause.
    if (!b.paused) {
      try { await inbox.resume(); } catch (error) { inbox.pause(String(error)); }
    } else notice("Orca checkpoint restored paused; /orca resume revalidates before effects");
  });
  pi.on("session_shutdown", async () => {
    live = false; // fence all late callbacks before aborting only owned CLI processes
    bridge?.stop();
    await inbox?.stop();
    bridge = undefined;
    inbox = undefined;
    context = undefined;
  });
  pi.on("session_before_tree", async () => { inbox?.pause("Tree navigation does not rewind Orca side effects; explicit resume required"); await inbox?.stop(); });
  pi.on("session_compact", () => { notice("Orca obligations remain in durable checkpoints and Orca Delivery, not the compacted summary"); });

  pi.registerCommand("orca", {
    description: "Explicit Orca lead binding: start <objective>, attach <run-id>, status, pause, resume, limit <n>",
    handler: async (args, ctx) => {
      if (commandBusy) { notice("An Orca command is already in flight"); return; }
      commandBusy = true;
      try {
        const match = args.trim().match(/^(\S+)(?:\s+([\s\S]*))?$/);
        const action = match?.[1] ?? "status", value = match?.[2] ?? "";
        const current = requireBridge(ctx);
        if (action === "status") {
          notice(JSON.stringify({ binding: state.bridge.binding, reservations: state.bridge.reservations.map(({ id, name, taskId, dispatchId, phase }) => ({ id, name, taskId, dispatchId, phase })), deliveryId: state.inbox.delivery?.id, recovery: state.inbox.recovery ?? state.bridge.recovery }));
        } else if (action === "start" || action === "attach") {
          if (!value.trim() || value.length > 12000) throw new Error(`Usage /orca ${action} <value>`);
          await current.bind(action, value);
          await inbox!.resume();
        } else if (action === "pause") {
          inbox!.pause("User requested pause");
          await inbox!.stop();
        } else if (action === "resume") {
          await inbox!.resume();
        } else if (action === "limit") {
          if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error("Limit must be a positive safe integer");
          const b = await current.validate(true);
          b.limit = Number(value);
          save();
          notice(`Limit set to ${b.limit} for this Run`);
        } else throw new Error("Use /orca start, attach, status, pause, resume, or limit");
      } catch (error) { inbox?.pause(String(error)); } finally { commandBusy = false; }
    },
  });
  pi.registerTool({
    name: "orca_delegate", label: "Orca Delegate",
    description: "Start one authorized local Pi worker in a new top-level worktree in the bound Run/repo. Explicit committed base only; dirty/untracked lead files are not copied. Capacity defaults to four. No retries, arbitrary argv, model overrides or recursive workers.",
    parameters: Type.Object({ title: Type.String({ minLength: 1, maxLength: 160 }), specification: Type.String({ minLength: 1, maxLength: 20000 }), worktreeName: Type.String({ minLength: 1, maxLength: 80 }), baseRef: Type.String({ minLength: 1, maxLength: 200 }) }),
    async execute(_id, params, signal, _update, ctx) {
      try {
        const r = await requireBridge(ctx).delegate(params, signal);
        return { content: [{ type: "text", text: JSON.stringify({ taskId: r.taskId, dispatchId: r.dispatchId, worktreeId: r.worktreeId, setupState: r.setupState, phase: r.phase, name: r.name }) }], details: { reservationId: r.id } };
      } catch (error) { if (live) inbox?.pause(String(error)); throw error; }
    },
  });
  pi.registerTool({
    name: "orca_inbox", label: "Orca Inbox",
    description: "Current Run FIFO batch: pending pages (6000 characters), exact question reply, exact delivery ack. Ack requires all pages read, verified replies, runtime cleanup proof and accountedMessageIds for every other message. receiptIndex pages expose retained delegate mutation receipts for recovery; no retries.",
    parameters: Type.Object({ op: StringEnum(["pending", "reply", "ack"] as const), page: Type.Optional(Type.Integer({ minimum: 0 })), receiptIndex: Type.Optional(Type.Integer({ minimum: 0 })), questionId: Type.Optional(Type.String()), answer: Type.Optional(Type.String({ maxLength: 12000 })), deliveryId: Type.Optional(Type.String()), accountedMessageIds: Type.Optional(Type.Array(Type.String())) }),
    async execute(_id, params, signal, _update, ctx) {
      const current = requireBridge(ctx);
      let output: string;
      try {
        if (params.op === "pending" && params.receiptIndex !== undefined) {
          // Inspection is intentionally available while paused, without mutations or replay.
          current.binding();
          const receipt = state.bridge.reservations[params.receiptIndex]?.receipt;
          const serialized = JSON.stringify(receipt ?? state.inbox.receipt ?? state.bridge.receipt ?? { recovery: state.inbox.recovery ?? state.bridge.recovery });
          const page = params.page ?? 0;
          output = `Receipt page ${page}; total pages ${Math.ceil(serialized.length / 6000)}\n${serialized.slice(page * 6000, (page + 1) * 6000)}`;
        } else if (params.op === "pending") {
          output = JSON.stringify(await inbox!.pending(params.page ?? 0));
        } else if (params.op === "reply") {
          if (!params.questionId || !params.answer) throw new Error("reply requires questionId and answer");
          await inbox!.reply(params.questionId, params.answer, signal);
          output = `Reply proven for ${params.questionId}`;
        } else {
          if (!params.deliveryId) throw new Error("ack requires exact deliveryId");
          await inbox!.ack(params.deliveryId, params.accountedMessageIds ?? [], signal);
          output = `Ack processed for ${params.deliveryId}; inspect next pending batch`;
        }
      } catch (error) { if (live) inbox?.pause(String(error)); throw error; }
      return { content: [{ type: "text", text: output }], details: {} };
    },
  });
}
export default function extension(pi: ExtensionAPI): void { install(pi); }
