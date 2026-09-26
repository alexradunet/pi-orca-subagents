import { test } from "node:test";
import assert from "node:assert/strict";
import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { install } from "../src/index.js";
import { FakeExecutor, delivery, message, tick } from "./helpers.js";

type Handler = (event: unknown, ctx: ExtensionContext) => Promise<unknown> | unknown;
function piHarness(entries: unknown[] = [], sessionId = "session_test") {
  const handlers = new Map<string, Handler>();
  const tools: string[] = [];
  const sent: Array<{ content: string; options: unknown }> = [];
  const notices: string[] = [];
  let command!: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
  const api = {
    on: (event: string, handler: Handler) => handlers.set(event, handler),
    registerTool: (tool: { name: string }) => tools.push(tool.name),
    registerCommand: (_name: string, definition: { handler: typeof command }) => { command = definition.handler; },
    appendEntry: (customType: string, data: unknown) => entries.push({ type: "custom", customType, data: structuredClone(data) }),
    sendMessage: (message: { content: string }, options: unknown) => sent.push({ content: message.content, options }),
  } as unknown as ExtensionAPI;
  const ctx = { cwd: "/repo", hasUI: true, isIdle: () => false, ui: { notify: (s: string) => notices.push(s), setStatus() {} }, sessionManager: { getSessionId: () => sessionId, getEntries: () => entries } } as unknown as ExtensionCommandContext;
  const fake = new FakeExecutor();
  install(api, fake, "term_test");
  return { entries, fake, tools, notices, sent, ctx, event: async (name: string, event: unknown = {}) => handlers.get(name)?.(event, ctx), command: async (args: string) => command(args, ctx) };
}
test("factory/startup detached: exactly two tools, one command, no spontaneous runtime work", async () => {
  const h = piHarness();
  assert.equal(h.fake.calls.length, 0);
  await h.event("session_start", { reason: "startup" });
  assert.deepEqual(h.tools, ["orca_delegate", "orca_inbox"]);
  assert.equal(h.fake.calls.length, 0);
  await h.event("session_shutdown");
});
test("busy lead receives attributed followUp, reload revalidates/replays pending question", async () => {
  const h = piHarness();
  await h.event("session_start", { reason: "startup" });
  h.fake.pending = delivery("d", [message("q", "question")]);
  await h.command("attach run_test");
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.sent[0]!.options, { triggerTurn: true, deliverAs: "followUp" });
  assert.match(h.sent[0]!.content, /untrusted/);
  await h.event("session_shutdown", { reason: "reload" });
  const reload = piHarness(h.entries);
  reload.fake.pending = h.fake.pending;
  await reload.event("session_start", { reason: "reload" });
  assert.equal(reload.sent.length, 1);
  assert.match(reload.sent[0]!.content, /replay/);
  assert.ok(reload.fake.calls.some((a) => a[1] === "run-show"));
  await reload.event("session_shutdown");
});
test("fork/clone/new/different session refuse inherited authority without consuming inbox", async () => {
  const h = piHarness();
  await h.event("session_start", { reason: "startup" });
  await h.command("attach run_test");
  await h.event("session_shutdown");
  for (const reason of ["fork", "new", "resume"]) {
    const next = piHarness(structuredClone(h.entries), "session_new");
    await next.event("session_start", { reason });
    assert.equal(next.fake.calls.length, 0);
    await next.command("resume");
    assert.equal(next.fake.calls.length, 0);
    assert.ok(next.notices.some((s) => s.includes("inheritance")));
    await next.event("session_shutdown");
  }
});
test("tree pauses and aborts wait; resume revalidates; compaction preserves obligations", async () => {
  const h = piHarness();
  await h.event("session_start", { reason: "startup" });
  await h.command("attach run_test");
  await tick();
  await h.event("session_before_tree");
  assert.equal(h.fake.aborted, 1);
  const before = h.fake.calls.length;
  await h.event("session_compact");
  assert.equal(h.fake.calls.length, before);
  h.fake.pending = delivery("d", [message("q", "question")]);
  await h.command("resume");
  assert.equal(h.sent.length, 1);
  await h.event("session_shutdown");
  assert.equal(h.fake.calls.some((a) => ["worker-stop", "worker-release"].includes(a[1]!)), false);
});
test("lost owner pauses on resume without delivery or mutation", async () => {
  const h = piHarness();
  await h.event("session_start", { reason: "startup" });
  await h.command("attach run_test");
  await h.command("pause");
  h.fake.owner = "term_elsewhere";
  const checks = h.fake.calls.filter((a) => a[1] === "check").length;
  await h.command("resume");
  assert.equal(h.fake.calls.filter((a) => a[1] === "check").length, checks);
  assert.ok(h.notices.some((s) => s.includes("ownership lost")));
  await h.event("session_shutdown");
});
