# Fixture provenance

`*.observed.json` are sanitized shapes from parent-verified native Orca 1.4.192 receipts. IDs, paths, timestamps and mutation request identities have been replaced with test values; no runtime identity/capability is reusable. These files do not prove the bridge was live-tested.

`failed-start.synthetic.json` is a synthetic failure envelope for conservative recovery behavior; no destructive live failure was forced. Mixed question/completion/status batches, races and mutation failures in test helpers are synthetic combinations of the observed envelope/message shape.

Native success envelopes have `ok` and `result`. Delivery fields live directly under `result` (not a nested delivery object); message `payload` is a JSON string or null. Empty timeout/ack responses may omit `replayed`; nonempty Delivery responses include it. Replies confirm `result.question.status=answered` with matching question/run/answer identity and body. Keepalive stderr is separate from the single stdout JSON record.
