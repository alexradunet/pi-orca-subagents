import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyInbox, OrcaInbox, parseDelivery, provenReply } from "../src/inbox.js";
import { resultOf } from "../src/orca.js";
import { answer, delivery, harness, message, receipt, tick } from "./helpers.js";

function receive(h: ReturnType<typeof harness>, id = "delivery_test", messages = [message("m")]) {
  const d = parseDelivery(delivery(id, messages), "run_test")!;
  h.inbox.receive(d, false);
  return d;
}
test("observed minimal fixture parses JSON-string payload and exact reply", () => {
  const d = parseDelivery(resultOf(JSON.parse(readFileSync(new URL("./fixtures/delivery-question.observed.json", import.meta.url), "utf8"))), "run_test")!;
  assert.equal(d.messages[0]?.dispatchId, "ctx_test");
  const r = resultOf(JSON.parse(readFileSync(new URL("./fixtures/reply.observed.json", import.meta.url), "utf8")));
  assert.equal(provenReply(r, "msg_question", "run_test"), true);
});
test("mixed batch requires every question, runtime cleanup and status accounting", async () => {
  const h = harness();
  receive(h, "d", [message("q", "question"), message("done", "worker_done"), message("status")]);
  await h.inbox.pending();
  await assert.rejects(h.inbox.ack("d", []), /question/);
  await h.inbox.reply("q", "yes");
  await assert.rejects(h.inbox.ack("d", []), /Account/);
  h.fake.cleanup.terminalResource.releaseState = "release_unknown";
  await assert.rejects(h.inbox.ack("d", ["status"]), /Cleanup not proven/);
  h.fake.cleanup.terminalResource.releaseState = "released";
  await h.inbox.ack("d", ["status"]);
  await h.inbox.stop();
  assert.equal(h.inboxState.delivery, undefined);
});
test("wrong Run, malformed payload/messages and connection uncertainty never discard batch", () => {
  for (const bad of [
    { ...delivery("d", [message("m")]), runId: "wrong" },
    delivery("d", [{ ...message("m"), run_id: "wrong" }]),
    delivery("d", [{ ...message("m"), payload: "broken" }]),
    delivery("d", [{}]),
    { ...delivery(), connectionLost: true },
  ]) assert.throws(() => parseDelivery(bad, "run_test"));
});
test("routine replay deduplicates and large batch requires every bounded page", async () => {
  const h = harness();
  const d = receive(h, "d", [message("m", "status", "🙂".repeat(10000))]);
  h.inbox.receive(d, true);
  assert.equal(h.sent.length, 1);
  assert.ok(h.sent[0]!.length < 7500);
  const first = await h.inbox.pending(0);
  await assert.rejects(h.inbox.ack("d", ["m"]), /every pending page/);
  for (let page = 1; page < first.pageCount; page++) assert.ok((await h.inbox.pending(page)).content.length <= 6000);
  await h.inbox.ack("d", ["m"]);
  await h.inbox.stop();
});
test("ack returning next batch retains it; empty ack restarts one wait", async () => {
  const h = harness();
  receive(h, "d1");
  await h.inbox.pending();
  h.fake.afterAck = delivery("d2", [message("m2")]);
  await h.inbox.ack("d1", ["m"]);
  assert.equal(h.inboxState.delivery?.id, "d2");
  assert.equal(h.sent.length, 2);
  await h.inbox.pending();
  h.fake.afterAck = delivery();
  await h.inbox.ack("d2", ["m2"]);
  await tick();
  assert.equal(h.fake.calls.filter((a) => a.includes("--wait")).length, 1);
  await h.inbox.stop();
  assert.equal(h.fake.aborted, 1);
});
test("reply receipt survives reload and prevents another mutation; lost receipt pauses", async () => {
  const h = harness();
  const d = receive(h, "d", [message("q", "question")]);
  await h.inbox.reply("q", "yes");
  const restored = structuredClone(h.inboxState);
  const resumed = new OrcaInbox(h.bridge, restored, { save() {}, notify() {}, inject() {} });
  resumed.receive(d, true);
  await resumed.reply("q", "yes");
  assert.equal(h.fake.calls.filter((a) => a[1] === "reply").length, 1);
  delete restored.replies.q;
  resumed.receive(d, true);
  assert.match(restored.recovery!, /Reply outcome unknown/);
  assert.equal(h.state.binding?.paused, true);
});
test("receive/persist/inject interruption replays from Orca once without losing question", async () => {
  for (const failure of ["persist", "inject"] as const) {
    const h = harness();
    const state = emptyInbox();
    const inbox = new OrcaInbox(h.bridge, state, { save() { if (failure === "persist") throw new Error("crash"); }, notify() {}, inject() { throw new Error("crash"); } });
    const d = parseDelivery(delivery("d", [message("q", "question")]), "run_test")!;
    assert.throws(() => inbox.receive(d, false), /crash/);
    let injected = 0;
    const reloaded = new OrcaInbox(h.bridge, structuredClone(state), { save() {}, notify() {}, inject() { injected++; } });
    reloaded.receive(d, true);
    reloaded.receive(d, true);
    assert.equal(injected, 1);
  }
});
test("reply intent survives unknown mutation, ack intent reconciles next batch on resume", async () => {
  const h = harness();
  receive(h, "d", [message("q", "question")]);
  h.fake.overrides.set("orchestration reply", async () => receipt({ question: "unknown" }, false));
  await assert.rejects(h.inbox.reply("q", "yes"));
  assert.deepEqual(h.inboxState.replyIntents, ["q"]);
  assert.ok(h.inboxState.recovery);
  const other = harness();
  receive(other, "d");
  other.inboxState.ackIntent = "d";
  other.fake.pending = delivery("next", [message("n")]);
  await other.inbox.resume();
  assert.equal(other.inboxState.delivery?.id, "next");
  assert.equal(other.inboxState.ackIntent, undefined);
});
test("pause during reply or ack rejects stale success and preserves unresolved intent", async () => {
  for (const op of ["reply", "ack"] as const) {
    const h = harness();
    receive(h, "d", [message("q", op === "reply" ? "question" : "status")]);
    await h.inbox.pending();
    let finish!: () => void;
    h.fake.overrides.set(`orchestration ${op === "reply" ? "reply" : "check"}`, async () => {
      await new Promise<void>((r) => { finish = r; });
      return receipt(op === "reply" ? answer("q") : delivery(null, [], "d"));
    });
    const pending = op === "reply" ? h.inbox.reply("q", "yes") : h.inbox.ack("d", ["q"]);
    await tick();
    h.inbox.pause("during mutation");
    finish();
    await assert.rejects(pending, /Stale/);
    assert.equal(h.inboxState.delivery?.id, "d");
    assert.equal(h.inboxState.replies.q, undefined);
  }
});

test("observed empty ack shape has no replayed field and remains valid", () => {
  const parsed = resultOf(JSON.parse(readFileSync(new URL("./fixtures/ack.observed.json", import.meta.url), "utf8")));
  assert.equal(parseDelivery(parsed, "run_test"), undefined);
});

test("empty wait triggers no model; shutdown fences stale reply/ack completions", async () => {
  const h = harness();
  let count = 0;
  h.fake.overrides.set("orchestration check", async (_args, options) => {
    if (++count === 1) return receipt(delivery());
    return new Promise((resolve) => options.signal?.addEventListener("abort", () => resolve(receipt({}, false)), { once: true }));
  });
  h.inbox.start();
  await tick();
  assert.equal(h.sent.length, 0);
  await h.inbox.stop();
  const stale = harness();
  receive(stale, "d", [message("q", "question")]);
  let finish!: () => void;
  stale.fake.overrides.set("orchestration reply", async () => { await new Promise<void>((r) => { finish = r; }); return receipt(answer("q")); });
  const pending = stale.inbox.reply("q", "yes");
  await tick();
  stale.bridge.stop();
  finish();
  await assert.rejects(pending);
  assert.equal(stale.inboxState.replies.q, undefined);
});
