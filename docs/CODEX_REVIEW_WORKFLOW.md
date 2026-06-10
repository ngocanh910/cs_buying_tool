# CODEX REVIEW WORKFLOW

This file is used to hand work off from **Claude Code** to **Codex** after each module or feature. The goal is for Codex to review, catch bugs, make small refactors, and maintain codebase quality without breaking the overall architecture.

---

## 1. Role of Codex

Codex is NOT the main agent responsible for building the entire project in this workflow.

Codex plays the role of:

- Code reviewer
- Bug hunter
- TypeScript/build/test fixer
- Small refactor assistant
- Security risk checker
- Logic edge case checker
- Cleaner for unused code, unused imports, and dead code
- Reviewer of the diff after Claude Code implements something

Do not use Codex to make large architectural changes unless explicitly requested.

---

## 2. When to Use Codex

Use Codex after each small checkpoint, for example:

- Base project setup is complete
- Auth flow is complete
- Database schema is complete
- CRUD module is complete
- Dashboard layout is complete
- API client is complete
- Upload/storage flow is complete
- Payment flow is complete
- Admin module is complete
- A major bug has just been fixed by Claude
- A refactor phase has just been completed

Do not wait until the whole project is finished before reviewing/refactoring.

---

## 3. Standard Workflow

```text
Claude Code builds feature/module
↓
Run build/test/lint if available
↓
Codex reviews the current diff
↓
Codex reports issues by severity
↓
Fix Critical/High issues first
↓
Run build/test/lint again
↓
Commit
↓
Continue to the next module
```

---

## 4. Mandatory Rules Before Codex Edits Files

Before allowing Codex to edit code, always require it to:

1. Read the current diff first.
2. Do not edit files on the first turn.
3. Report issues first.
4. Group issues by severity.
5. Clearly state which files have problems.
6. Clearly state whether each refactor should be done now or later.
7. Do not change behavior unless necessary.
8. Do not refactor across unrelated modules.
9. Do not delete code without explaining why.
10. Do not change packages/dependencies without asking first.

---

## 5. Main Codex Review Prompt

Use this prompt after Claude Code has just implemented a part of the project:

```text
You are the code reviewer for the part that was just implemented by Claude Code.

Tasks:
- Review the entire current diff.
- Do not edit files yet.
- Do not run destructive commands.
- Do not make large architectural changes.

Focus on:
1. Logic bugs
2. Type safety
3. Security risks
4. Code duplication
5. Folder/module structure
6. Naming inconsistency
7. Performance issues
8. Error handling
9. Edge cases
10. Parts that should be refactored now
11. Parts that should be refactored later

Return the result in this format:

## Summary
Summarize the quality of the code that was just implemented.

## Critical Issues
Issues that could make the app behave incorrectly in a serious way, crash, lose data, expose secrets, or cause auth/security problems.

## High Issues
Issues that should be fixed before committing.

## Medium Issues
Maintainability, type safety, duplication, or structure problems.

## Low Issues
Naming, style, and small cleanup issues.

## Recommended Fix Order
The most reasonable order to fix the issues.

## Files To Touch
List the files that should be changed and explain why.

## Do Not Touch
List the parts that should not be touched to avoid broad, unnecessary refactoring.
```

---

## 6. Prompt for Codex to Fix Issues After Review

Only use this after Codex has finished the review:

```text
Fix the Critical and High issues first.

Constraints:
- Do not change behavior outside the reviewed scope.
- Do not refactor across unrelated modules.
- Do not change the public API unless necessary.
- Do not add new packages unless you ask first.
- Do not delete code unless you are sure it is no longer used.
- Prefer small, clear fixes that are easy to review.

After fixing, report:
1. Files changed
2. Issues fixed
3. Why this fix is safe
4. Commands that should be run to verify
5. Whether any remaining issues should be handed back to Claude Code
```

---

## 7. Prompt for Small Codex Refactors

Use this when the code works but is messy, repetitive, or hard to maintain:

```text
Make a small refactor for the code that was just reviewed.

Goals:
- Preserve existing behavior.
- Reduce duplication.
- Improve readability.
- Improve type safety.
- Do not change the overall architecture.
- Do not refactor outside the current module scope.

Before editing, list:
1. What the refactor will do
2. Which files will be changed
3. Possible risks
4. How to verify after the refactor

Only edit files after I approve.
```

---

## 8. Build/Test Error Analysis Prompt

Use this when the project has build/test errors after Claude or Codex makes changes:

```text
Analyze the current build/test error.

Requirements:
- Read the error log first.
- Identify the root cause.
- Do not make broad, unrelated fixes.
- Only fix the part directly related to the error.
- If there are multiple possible fixes, propose them first before editing.

After fixing, rerun the appropriate command if possible.
```

---

## 9. Security Review Prompt

Use this for sensitive areas such as auth, payment, upload, API keys, permissions, and database code:

```text
Review the security of the current code.

Focus on:
1. Auth bypass
2. Permission checks
3. Input validation
4. Secret/API key exposure
5. Token/session handling
6. SQL/NoSQL injection
7. File upload risks
8. XSS/CSRF if related to frontend/web
9. Insecure error messages
10. Dependency risks

Do not edit files yet.
Report risks by severity: Critical/High/Medium/Low.
Then propose a fix order.
```

---

## 10. Prompt to Hand Large Issues Back to Claude Code

If Codex finds a large architectural issue, Codex should not refactor the whole thing by itself. Use this prompt to hand the issue back to Claude Code:

```text
Codex reviewed the code and found the following architectural issues:

[Paste Codex's report here]

Act as the main architect of the project.
Tasks:
- Evaluate these issues.
- Split the refactor into small phases.
- Do not edit files yet.
- Each phase must have a clear goal, expected files to change, risks, and verification steps.
- Prioritize preserving the current behavior.
```

---

## 11. Pre-Commit Checklist

Before committing after a Codex review/fix:

```text
[ ] Diff has been reviewed
[ ] No changes outside the intended scope
[ ] No secret/API key exposure
[ ] No accidental file/code deletion
[ ] Build passes
[ ] Tests pass if available
[ ] Lint passes if available
[ ] No suspicious dependency added
[ ] Public API was not changed unintentionally
[ ] Main behavior is still preserved
[ ] Remaining issues have been documented
```

---

## 12. Recommended Git Commands

Create a separate branch before a major review/refactor:

```bash
git checkout -b review/codex-checkpoint
```

Commit a clean checkpoint before allowing Codex to make changes:

```bash
git add .
git commit -m "checkpoint: before codex review"
```

View the diff after Codex makes changes:

```bash
git diff
```

Commit after verification:

```bash
git add .
git commit -m "fix: address codex review issues"
```

---

## 13. Safety Rules When Using Codex

Do not auto-approve dangerous commands such as:

```bash
rm -rf
del /s
curl ... | sh
powershell iex
npm install unknown-package
pip install unknown-package
git push --force
```

Always check carefully if Codex wants to:

- Install a new package
- Edit deploy configuration files
- Edit database migrations
- Edit auth/session/token logic
- Touch `.env`
- Touch payment-related code
- Delete many files at once
- Run destructive commands

---

## 14. Sample AI_CONTEXT for Handoffs Between Claude Code and Codex

Create an additional `AI_CONTEXT.md` file if the task is long:

```markdown
# AI CONTEXT

## Current Task

Currently working on:

## Current Status

Completed:

## Files Changed

-

## Known Issues

-

## Need Codex Review For

-

## Build/Test Commands

- npm run build
- npm run test
- npm run lint

## Rules

- Do not change behavior unless necessary.
- Do not refactor across unrelated modules.
- Do not add dependencies without asking first.
```

---
