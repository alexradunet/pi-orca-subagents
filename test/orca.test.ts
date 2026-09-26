import { test } from "node:test";
import assert from "node:assert/strict";
import { OrcaCli, OrcaBridge, resolveOrcaCommand } from "../src/orca.js";
import { harness, receipt, tick } from "./helpers.js";
const request = (name = "worker") => ({ title: "quoted '\" ;", specification: "line1\n$(touch nope)", worktreeName: name, baseRef: "selected-ref" });

test("bounded CLI preserves argv, separates stderr keepalive and validates envelopes", async () => {
  const cli = new OrcaCli(process.execPath);
  const spec = "quote '\"\n$(touch nope);";
  const r = await cli.run(["-e", "console.error('{\"keepalive\":true}'); console.log(JSON.stringify({ok:true,result:{arg:process.argv[1]}}))", spec], { cwd: process.cwd() });
  assert.equal(r.ok, true);
  assert.equal((r.json as { result: { arg: string } }).result.arg, spec);
  assert.match(r.stderr, /keepalive/);
  for (const output of ["not json", "{}", '{"ok":true}']) {
    const bad = await cli.run(["-e", `console.log(${JSON.stringify(output)})`], { cwd: process.cwd(), mutation: true });
    assert.equal(bad.ok, false);
    assert.equal(bad.unknownMutation, true);
  }
});
test("nonzero receipt retained, capture bounded, cancellation waits for child close", async () => {
  const cli = new OrcaCli(process.execPath);
  const failed = await cli.run(["-e", "console.log(JSON.stringify({ok:false,result:{stage:'launch',recovery:['inspect']}}));process.exit(75)"], { cwd: process.cwd(), mutation: true });
  assert.equal(failed.exitCode, 75);
  assert.match(JSON.stringify(failed.json), /recovery/);
  const oversized = await cli.run(["-e", "process.stdout.write('x'.repeat(1000000));setInterval(()=>{},1000)"], { cwd: process.cwd(), maxStdoutBytes: 100 });
  assert.equal(Buffer.byteLength(oversized.stdout), 100);
  assert.equal(oversized.ok, false);
  const controller = new AbortController();
  const pending = cli.run(["-e", "setInterval(()=>{},1000)"], { cwd: process.cwd(), signal: controller.signal });
  controller.abort();
  assert.equal((await pending).ok, false);
});
test("argv forwarding uses exact repo/base, never copies dirty source or adds model flags", async () => {
  const h = harness();
  await h.bridge.delegate(request());
  const create = h.fake.calls.find((a) => a[1] === "task-create")!;
  assert.match(create[create.indexOf("--spec") + 1]!, /\$\(touch nope\)/);
  const start = h.fake.calls.find((a) => a[1] === "worker-start")!;
  assert.equal(start[start.indexOf("--base-branch") + 1], "selected-ref");
  assert.equal(start[start.indexOf("--repo") + 1], "id:repo_test");
  assert.equal(start[start.indexOf("--worktree") + 1], "new-top-level");
  assert.equal(start.includes("--model"), false);
  assert.equal(h.fake.calls.some((a) => a[0] === "git" || a[0] === "cp"), false);
});
test("four concurrent admissions reserve before I/O; fifth refused; completed tasks free slots", async () => {
  const h = harness();
  let finish!: () => void;
  const gate = new Promise<void>((r) => { finish = r; });
  h.fake.overrides.set("orchestration worker-start", async (args) => {
    await gate;
    return receipt({ runId: "run_test", taskId: args[args.indexOf("--task") + 1], dispatchId: "ctx_test", state: "ready", stage: "input_accepted", setup: { state: "running" }, effects: [{ kind: "worktree", action: "created_top_level", id: "repo_test::/fixture" }] });
  });
  const calls = [0, 1, 2, 3, 4].map((i) => h.bridge.delegate(request(`worker${i}`)));
  const fifth = assert.rejects(calls[4]!, /Capacity/);
  await tick();
  assert.equal(h.state.reservations.length, 4);
  finish();
  await Promise.all(calls.slice(0, 4));
  await fifth;
  h.fake.tasks = h.state.reservations.map((r) => ({ id: r.taskId, run_id: "run_test", status: "completed" }));
  await h.bridge.delegate(request("replacement"));
  assert.equal(h.state.reservations.length, 1);
});
test("unknown task/create and start remain durable occupied reservations after reload", async () => {
  const h = harness();
  h.fake.overrides.set("orchestration task-create", async () => receipt({ recovery: "inspect" }, false));
  await assert.rejects(h.bridge.delegate(request()), /failed/);
  assert.equal(h.state.reservations[0]?.phase, "task_unknown");
  const restored = structuredClone(h.state);
  const next = new OrcaBridge(h.fake, h.bridge.identity, "orca-ide", restored, () => {});
  await assert.rejects(next.delegate(request()), /already reserved/);
  h.fake.overrides.delete("orchestration task-create");
  h.fake.overrides.set("orchestration worker-start", async () => receipt({ state: "outcome_unknown", residualResources: ["fixture"] }, false));
  await assert.rejects(h.bridge.delegate(request("other")), /failed/);
  assert.equal(h.state.reservations[1]?.phase, "start_unknown");
  assert.ok(h.state.reservations[1]?.taskId);
});
test("active worker in any Run cannot start/attach; ownership and session/repo changes fail closed", async () => {
  const h = harness();
  h.fake.workers = [{ dispatchStatus: "dispatched", agentTerminalHandle: "term_test", runId: "run_elsewhere", terminalState: "retained" }];
  await assert.rejects(h.bridge.validate(), /Active worker/);
  h.fake.workers = [];
  h.fake.owner = "term_other";
  await assert.rejects(h.bridge.validate(), /ownership lost/);
  h.fake.owner = "term_test";
  h.state.binding!.sessionId = "forked";
  await assert.rejects(h.bridge.validate(), /inheritance/);
  delete h.state.binding;
  await assert.rejects(h.bridge.delegate(request()), /No bound/);
});
test("pre-aborted CLI and delegate do not start effects; attach checks owner before run-use", async () => {
  const controller = new AbortController();
  controller.abort();
  const r = await new OrcaCli("/definitely-not-an-executable").run([], { cwd: process.cwd(), signal: controller.signal, mutation: true });
  assert.match(r.error!, /before spawn/);
  assert.equal(r.unknownMutation, false);
  const h = harness();
  await assert.rejects(h.bridge.delegate(request(), controller.signal));
  assert.equal(h.fake.calls.length, 0);
  delete h.state.binding;
  h.fake.owner = "term_other";
  await assert.rejects(h.bridge.bind("attach", "run_test"), /Attach refused/);
  assert.equal(h.fake.calls.some((a) => a[1] === "run-use"), false);
});

test("fixed CLI resolution has no error fallback", () => {
  assert.equal(resolveOrcaCommand({}, "linux"), "orca-ide");
  assert.equal(resolveOrcaCommand({ ORCA_CLI_COMMAND: "/custom" }, "linux"), "/custom");
  assert.equal(resolveOrcaCommand({ ORCA_DEV_REPO_ROOT: "/dev" }, "linux"), "orca-dev");
});
