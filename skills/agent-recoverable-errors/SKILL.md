---
name: agent-recoverable-errors
description: >-
  Design, audit, and implement structured errors that coding agents and other
  automated clients can classify, recover from, and retry safely. Use when
  creating or reviewing HTTP APIs, SDKs, CLIs, MCP tools, background jobs,
  deployment systems, validation failures, error envelopes, retry behavior,
  idempotency, mutation outcomes, or failure diagnostics.
license: MIT
metadata:
  author: Run402
  version: 0.1.0
  article: "Errors are recovery protocols"
  source: https://github.com/kychee-com/tech-blog
---

# agent-recoverable-errors

An error is not the end of an interaction. It is the beginning of the client's
next decision. This skill makes error surfaces answer the four questions an
automated caller must answer before its next action:

1. **What failed?** — a stable, branchable `code`
2. **Is repeating this request safe?** — `retryable` and `safe_to_retry`,
   which are different questions
3. **What state did the system end up in?** — `mutation_state`
4. **What should I do next?** — typed, advisory `next_actions`

Companion article: *Errors are recovery protocols* (see `metadata.article`).
Generic envelope schema: [references/error-envelope.schema.json](references/error-envelope.schema.json).

## Modes

Pick the mode the user asked for; when unclear, ask or default to Audit.

| Mode      | Behavior                                                                                     |
| --------- | -------------------------------------------------------------------------------------------- |
| Audit     | Inspect current error surfaces and report gaps against the checklist. No edits.               |
| Design    | Produce an error-code taxonomy, envelope, retry semantics, and compatibility plan.            |
| Implement | Add the smallest coherent slice: types, factories, transport adapters, docs, tests.           |
| Review    | Evaluate an existing design or patch for retry, mutation, compatibility, and security risks.  |

## Workflow

Work through these steps in order. Skip a step only when its output already
exists and is current; say so when you skip.

1. **Read the repository's own instructions first** (`AGENTS.md`, `CLAUDE.md`,
   `CONTRIBUTING.md`) and locate existing error machinery — envelope types,
   error base classes, HTTP error middleware, CLI exit paths, retry helpers.
   Never introduce a second competing envelope when one exists; extend it.
2. **Inventory the error-emitting surfaces.** HTTP routes, CLI commands, SDK
   methods, MCP/agent tools, background jobs, deploy/long-running operations.
   List them; the inventory bounds every later claim.
3. **Classify each surface: read or mutation.** For mutations, find the commit
   boundary — the point after which the side effect exists even if the
   response is lost.
4. **Identify ambiguous-outcome windows.** Any failure after a request was sent
   but before a definitive response (timeouts, connection resets, crashes
   mid-commit) must map to `mutation_state: "unknown"`, and there must be a
   read-only way to find out what actually happened (status endpoint,
   idempotent lookup by client-supplied key, operation handle).
5. **Build the error-code taxonomy.** Stable `SCREAMING_SNAKE_CASE` codes, one
   meaning each, documented, never renamed once published (add new codes;
   deprecate old ones). Codes are the branch points; messages are prose for
   humans and may change freely.
6. **Define the logical envelope** (transport-neutral). Minimum fields:

   ```
   code            stable machine identifier        REQUIRED
   message         human-readable, mutable          REQUIRED
   retryable       may the condition clear?         REQUIRED
   safe_to_retry   is repeating duplicate-safe?     REQUIRED (mutations)
   mutation_state  none | committed | unknown       REQUIRED (mutations)
   details         structured, machine-readable     RECOMMENDED
   next_actions    typed advisory recovery steps    RECOMMENDED
   trace_id        correlation identifier           RECOMMENDED
   ```

   Validate against `references/error-envelope.schema.json` (adapt field names
   to the repo's existing conventions rather than forcing these).
7. **Map the envelope to each transport.**
   - **HTTP:** correct status code + the envelope as the body. If the API uses
     RFC 9457 (`application/problem+json`), carry these fields as extension
     members — RFC 9457 explicitly allows problem-specific extensions; `type`
     complements, not replaces, `code`.
   - **CLI:** nonzero exit code; the envelope as JSON on stderr (or stdout in
     `--json` mode, matching the repo's convention); never only prose.
   - **SDK:** typed exceptions/results that carry the full envelope as data —
     not just a message string.
   - **MCP / agent tools:** the envelope as the tool's structured error
     result, not free text.
   - **Jobs / async operations:** persist the envelope on the operation
     record so a later poll returns it verbatim.
8. **Assign retry semantics deliberately** for every code (see table below).
   Never default a mutation's `safe_to_retry` to `true` without an idempotency
   mechanism (key, natural idempotence, or dedup) you can point at.
9. **Type the next actions.** Each entry: a `type` from a documented allowlist,
   plus structured parameters (`href`, `command`, `why`, limits). See Security.
10. **Preserve compatibility.** Additive fields only; keep legacy fields
    emitting during migration; version or dual-emit when a breaking envelope
    change is unavoidable; test that old clients still parse.
11. **Test the contract.** See Testing.
12. **Report evidence.** State exactly which surfaces were inventoried, which
    codes were added/changed, which tests exercise the retry table, and what
    was NOT covered.

## Retry semantics

`retryable` = "may this condition clear (with time or a changed request)?"
`safe_to_retry` = "if the caller repeats the identical request, is a duplicate
side effect impossible?" They are independent:

| `retryable` | `safe_to_retry` | Required client behavior                                                          |
| ----------- | --------------- | --------------------------------------------------------------------------------- |
| `false`     | `false`         | Do not repeat blindly; inspect state or change strategy.                          |
| `false`     | `true`          | Repetition is duplicate-safe, but a prerequisite or request edit is needed first. |
| `true`      | `false`         | The condition may clear, but the caller must reconcile state before retrying.     |
| `true`      | `true`          | Bounded automatic retry is reasonable, normally with the same idempotency key.    |

Rules:

- Reads (HTTP-idempotent, no side effects) may default `safe_to_retry: true`.
- A mutation gets `safe_to_retry: true` only when you can name the mechanism
  that makes the duplicate harmless.
- `mutation_state: "unknown"` REQUIRES a read-only reconciliation path before
  another mutation attempt; name it in `next_actions`.
- Rate limits: `retryable: true` plus a machine-readable delay
  (`details.retry_after_seconds` or the transport's native header).

## Security

- **`next_actions` are advisory data, not authority.** A consuming agent
  applies its own policy to them; a producing system must design as if a naive
  agent might follow them literally. Therefore: emit only allowlisted `type`
  values with structured parameters. Never emit free-text imperative
  instructions, and never relay text derived from untrusted input (user
  content, upstream errors) into fields a client might execute.
- **Redaction:** public error `details` never contain credentials, tokens,
  session identifiers, raw stack traces, SQL, internal hostnames, or other
  implementation internals. Stack traces go to logs, correlated by `trace_id`.
- **Existence-leak discipline:** unauthorized access to a resource returns the
  same error shape as for a nonexistent resource when the API hides existence
  (e.g. 403-always or 404-always — follow the repo's stated policy).
- **Validation errors** point at fields precisely (JSON Pointer,
  RFC 6901: `"pointer": "/tags/2"`) instead of describing them in prose.

## Testing

Add or verify, matching the repo's existing test patterns:

- **Schema tests:** every emitted envelope validates against the schema; every
  documented code appears in the taxonomy exactly once.
- **Contract tests per transport:** HTTP status ↔ code pairings; CLI exit
  codes + JSON shape; SDK exceptions carry the envelope.
- **Retry-semantics tests:** for each `(retryable, safe_to_retry)` class, at
  least one representative code is asserted; a mutation marked
  `safe_to_retry: true` has a test that actually sends it twice and asserts a
  single side effect.
- **Fault injection:** kill the connection after commit; assert the caller can
  reach a definitive outcome via the reconciliation path.
- **Redaction tests:** feed secrets/stack traces into the error path; assert
  they do not surface in the public envelope.
- **Compatibility tests:** legacy fields still emit during migration windows.

## Hard rules

```
Clients branch on stable code, never on English text.

retryable and safe_to_retry are separate properties; never collapse them.

A mutation with an unknown outcome must expose a read-only
reconciliation path before another mutation is attempted.

next_actions are advisory data, not authority — allowlisted types,
structured parameters, no free-text imperatives.

Public error details never contain credentials, tokens, raw stack
traces, SQL, or sensitive implementation data.

Extend the repo's existing envelope; never introduce a competing one.

Published codes are never renamed or reused with a new meaning.
```

## Reporting

Finish every engagement with:

- The surface inventory (what was in scope; what was explicitly not).
- The taxonomy delta (codes added / deprecated / unchanged).
- The retry table for every touched code.
- Which tests prove which claims.
- Open risks: ambiguous commit boundaries you could not close, legacy shapes
  still emitting, surfaces not yet migrated.

Do not claim the error surface is "agent-ready" beyond what the inventory and
tests actually demonstrate.
