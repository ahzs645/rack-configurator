# Agent access: implementation plan

Status: architecture audit and build plan, September 4, 2026. The application does not yet register WebMCP tools or run an autonomous agent. `public/agents.txt` and `public/llms.txt` provide an immediate UI workflow and discovery entry point. The names below are proposed interfaces, not callable tools.

## Four complementary parts

| Part | Purpose | Where it belongs |
| --- | --- | --- |
| WebMCP tools | Read and change the live app using typed operations | A browser adapter over shared application commands |
| Agent-readable text | Discover capabilities, units, constraints and current limitations | Static `llms.txt` and `agents.txt` under the app's base URL |
| Agent skill | Teach an external agent the operating workflow and recovery rules | A distributable `skills/rack-configurator/SKILL.md`, after the tool contract is stable |
| Bounded execution loop | Plan, validate, apply, render and inspect, with explicit stop conditions | Agent orchestration over the same commands and a render job queue |

WebMCP is an interface, not the model or an autonomous loop. A text file is guidance, not executable access. A skill should call the tools, not duplicate the geometry rules. Start with external browser agents; an in-app model would additionally need a provider integration, credential handling, budgets and a user-visible run panel.

The current Chrome documentation uses `document.modelContext.registerTool`, JSON Schema inputs and an abort signal for registration cleanup. Feature-detect support; older experimental implementations used `navigator.modelContext`. Keep any legacy adapter separate, and show capability status instead of silently claiming support. Normal browsers must continue to work without WebMCP. See [Chrome's imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) and the [WebMCP draft](https://webmachinelearning.github.io/webmcp/).

## Existing foundations and concrete gaps

| Area | Reuse | Work needed |
| --- | --- | --- |
| State and actions | `src/state/rack-store.ts` | Extract validated commands; add monotonic config revision, transaction IDs and general undo. Current undo only covers fitting. |
| Device catalog | `src/data/devices.ts` and `device-geometry.ts` | Expose resolved dimensions, supported mounts/orientations and measurement provenance. Never substitute fallback dimensions for unknown agent input. |
| Fit checks | `src/utils/layout-fit.ts` | Return stable issue codes, affected IDs and numeric clearance data in addition to messages. Preserve the distinction between envelope checks and physical print verification. |
| Proposals | `fitTo2U` and `FitPanel` | Move proposal storage out of local component state into a shared service; assign proposal ID and source revision. |
| Import | `parseConfigJson` | It currently checks only numeric `rackU` and a `devices` array. Add a versioned runtime schema covering finite values, enums, IDs, limits, array sizes, shared groups and migration. |
| Render | `src/worker/openscad-runner.ts` | Add per-job status, queue, cancellation and content hash. Current timeout resolves without terminating computation; `terminateWorker` clears pending requests without settling callers. |
| Export | SCAD generator, bundler and STL exporters | Return named artifacts plus MIME type, source revision/hash and verification report. A download click alone is not a verifiable tool result. |
| UI fallback | Toolbar and property panels | Associate every input label with its control, make clickable cards keyboard accessible, and expose render state and errors as status regions. |

## Proposed command contract

Use one runtime-validated command service for UI, WebMCP and a future CLI/MCP server. Do not expose the raw Zustand store, arbitrary JavaScript, arbitrary SCAD execution or URL fetching to agents.

| Command | Inputs | Result / behavior |
| --- | --- | --- |
| `rack_get_state` | none | Revision, config, resolved envelopes, current issues and active render jobs |
| `rack_list_devices` | Optional query/category | Catalog IDs, dimensions, mount/orientation support |
| `rack_validate` | Current revision or staged proposal ID | Stable issues and numeric clearances; no changes |
| `rack_propose_changes` | Expected revision, bounded typed edit list | Staged config, diff, issues and proposal ID; no live changes |
| `rack_propose_fit` | Expected revision, target U and allowed transformations | A staged fit result; initially reject targets other than supported 2U |
| `rack_apply_proposal` | Proposal ID, expected revision, request ID | Atomic commit or `STALE_REVISION`; repeated request IDs return the same result |
| `rack_undo` | Transaction ID, expected revision | Undo only if it cannot overwrite intervening user changes |
| `rack_render` | Revision, side, quality | Job ID, source hash; queue rather than overlapping WASM work |
| `rack_get_job` / `rack_cancel_job` | Job ID | Status/result or cancellation that settles every waiting caller |
| `rack_export` | Verified source hash, format, side | JSON/SCAD/STL artifacts tied to that exact configuration |

Typed edits should cover add/remove device, position, orientation, mount, rear closure, shared support, dimensions, ears and joiner settings. Validate the entire candidate before committing. Reject unsupported transforms and nonfinite numbers; never silently delete a device, change sides or raise rack height to make validation pass.

Return structured envelopes such as `{ok, revision, transactionId, issues, result}`. Use machine-readable errors such as `INVALID_INPUT`, `STALE_REVISION`, `FIT_NOT_FOUND`, `RENDER_FAILED` and `CANCELLED`. A generated filename must come from the app, not an arbitrary destination path supplied by the agent. Treat imported device names and descriptions as data, not instructions.

## Loop and stopping rules

1. Read a snapshot and record the user's constraints: 2U, device identities, allowed side changes, supported orientations and mount changes.
2. Propose a bounded set of candidate edits against that revision. For fitting, enumerate at most three allowed policies, from least change to compact/shared supports; use the deterministic solver inside each policy.
3. Validate each candidate and reject those violating hard constraints. Remember candidate hashes; do not retry an unchanged failed candidate.
4. Apply a valid proposal atomically within the user's authorized scope. If the user edits during planning, return a revision conflict and re-read; never replay the old proposal blindly.
5. Render the committed revision. Await a job result with a timeout and cancellation, not a fixed sleep or repeated screenshots.
6. Check successful geometry output, connected parts, height, device cavities and the relevant visual detail. A green 2D envelope check alone is not success. Slicer support/overhang analysis and physical assembly checks remain separate evidence.
7. Export artifacts from the verified hash and report changes and limitations. Stop immediately on success, cancellation, exhausted candidate budget, repeated identical failure or a missing required user constraint.

Cap a run by both attempts and elapsed time, permit only one render job per worker, expose Stop and Undo, and keep a visible action log. Do not put an unbounded self-retry loop in a skill or schedule background runs without a user request.

## Build sequence and acceptance criteria

1. **Command core:** runtime schema, revisions, atomic edits and undo. Test malformed JSON, invalid catalog IDs, shared-group consistency, stale proposals and request replay.
2. **Read-only WebMCP:** state/catalog/validation plus feature-detected registration and cleanup. Verify actual discovery and calls in a supporting browser, and graceful absence in an ordinary browser.
3. **Mutations and skill:** propose/apply/undo, visible change log, documented errors. Test a human edit between proposal and apply and a complete 2U workflow through tools.
4. **Render/export jobs:** cancellation, timeout recovery, artifact hashes and bounded loop. Test worker failure, cancelled jobs, stale renders and exported geometry agreement.
5. **Optional in-app agent:** provider backend and user-controlled run budgets. This is additional product work, not required to let an external agent operate the app.

The end-to-end acceptance scenario is the user's four-device rack: preserve 2U and all devices, rotate the Pi, keep shared honeycomb supports on the left, preserve nut-right/screw-left, render both connected halves, verify insertion spaces, export the two STLs and matching JSON, then undo without losing a newer user edit.
