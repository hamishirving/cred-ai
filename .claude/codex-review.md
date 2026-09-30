# Codex review — canonical invocation

Cross-model review runs the `codex exec` CLI directly (frontier non-Claude model, for a genuine second opinion). **Do not use `codex exec review` or the `codex:rescue` / `codex:setup` plugin flow** — they run with default model/effort settings and skip the brief. Pattern adapted from cred-product's `.claude/templates/prd/codex-invocation.md` via cred-fe's `.claude/codex-review.md`.

## Invocation

```bash
cat {input-file} | codex exec \
  --model gpt-5.6-sol \
  -c model_reasoning_effort=high \
  --skip-git-repo-check \
  --color never \
  -o {output-file} \
  "$(cat {brief-file})"
```

| Flag | Why |
|---|---|
| `--model gpt-5.6-sol` | Current frontier; bump here when newer lands. |
| `-c model_reasoning_effort=high` | Depth is the point of cross-model review. |
| `--skip-git-repo-check` | Dispatch dir isn't always the repo root. |
| `--color never` | No ANSI codes in the saved file. |
| `-o {output-file}` | Writes the final message straight to disk. |
| `cat {input} \| …` | Stdin is appended as a `<stdin>` block — end the brief with "the diff follows as a `<stdin>` block". |

## Input

The diff under review. `git diff` misses untracked files, so bundle them in:

```bash
{ git diff; git ls-files --others --exclude-standard | xargs -I{} git diff --no-index /dev/null {}; } > {scratchpad}/review.diff
```

For a branch, use `git diff main...HEAD -- . ':(exclude)pnpm-lock.yaml'`.

## Brief

A tight brief (<40 lines) in the scratchpad, passed as the prompt:
- What to do: audit only, no edits; concrete defects with file:line, failure scenario, severity (P0–P3); "no findings" is valid.
- The acceptance checklist — what the change is meant to achieve.
- Files touched + why, tied to an acceptance item.
- Deviations from existing patterns and known compromises ("None" is valid).
- Baseline gate state (`tsc`, Biome) so pre-existing reds aren't flagged.
- 1–2 things to pressure-test. A brief that just restates the diff is a smell.

## Running it

- Output goes to the scratchpad, not the repo, unless the user wants it kept.
- **Run in the background** with the Bash tool's `run_in_background: true` — but do **not** also add a trailing `&`. Double-backgrounding orphans Codex before it writes `-o`.
- Wait for the completion notification, then read the `-o` file. Verify each finding against the code before acting on it; Codex audits, Claude implements.
- **Failure is acceptable degradation, not a bug**: if `codex exec` exits non-zero, runs out of credits, or the output file is empty, tell the user the Codex pass is missing — never retry silently, and never present a self-review as a cross-model review.

## When it runs

Before committing / opening a PR for a substantive change, and whenever the user asks for a Codex review.
