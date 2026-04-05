# Common Bug Patterns

Technology-agnostic checklist of the most frequently encountered bug categories, ordered by frequency. The debugger agent consults this before forming hypotheses to avoid overlooking common causes.

---

## Off-by-One / Boundary Errors

- **Loop bounds:** Check `<` vs `<=`, `0` vs `1` start index, and `length` vs `length - 1`.
- **Slice/substring ranges:** Verify inclusive vs exclusive end index -- off-by-one here silently drops or includes extra elements.
- **Empty collection:** Does the code handle zero-length arrays, empty strings, or empty maps without erroring?
- **Fence-post:** Count the items vs the gaps between them -- pagination offsets and range calculations are classic triggers.

---

## Null / Undefined Access

- **Unchecked return values:** Functions that return `null`, `None`, `nil`, or `undefined` on failure -- caller assumes success.
- **Optional chaining depth:** Nested access like `a.b.c.d` fails when any intermediate property is missing.
- **Default values:** Check whether defaults are applied before first use -- late defaults leave a window for null dereference.
- **Deleted or cleared state:** Object properties removed at runtime, or state reset to null between checks and usage.

---

## Async / Timing Issues

- **Missing await:** An `async` call without `await` returns a Promise object instead of the resolved value.
- **Race conditions:** Two operations read-then-write the same resource -- the second overwrites the first's result.
- **Unhandled promise rejection:** A rejected promise with no `.catch()` or `try/catch` silently swallows the error.
- **Callback ordering:** Assuming callbacks fire in registration order -- event loops and I/O scheduling offer no such guarantee.
- **Stale closure:** A callback captures a variable by reference, then fires after the variable has changed.

---

## State Management Bugs

- **Stale state:** Reading state that was set in a previous tick or render cycle -- the value has not updated yet.
- **Unintended mutation:** Modifying an object or array in place when the consumer expects an immutable copy.
- **Missing initialization:** A variable is declared but never assigned before first read -- defaults to zero, null, or undefined depending on language.
- **Shared global state:** Multiple callers read/write the same global or singleton without coordination.
- **State desync:** Two representations of the same data (cache and source, UI and model) drift apart after a partial update.

---

## Import / Require Errors

- **Wrong path or casing:** `./Utils` vs `./utils` -- works on case-insensitive filesystems, fails on Linux/CI.
- **Circular dependencies:** Module A imports B, B imports A -- one of them gets a partially-initialized export.
- **Missing or renamed export:** The imported name no longer exists in the source module after a refactor.
- **CJS/ESM mismatch:** Mixing `require()` and `import` without interop configuration causes silent failures or runtime errors.

---

## Environment / Config Mismatches

- **Wrong environment variable:** Code reads `API_URL` but the deployment sets `API_BASE_URL`.
- **Missing config in one environment:** Works locally with `.env`, fails in CI/staging where the file is absent.
- **Path separator mismatch:** Hardcoded `/` breaks on Windows; hardcoded `\` breaks everywhere else.
- **Default overrides:** A config default masks a missing required value -- the code runs but with wrong behavior.

---

## Data Shape Mismatches

- **Expected object, got array (or vice versa):** API returns `[]` on empty result but code expects `{}` or `null`.
- **Missing field:** A required property is absent because the data source schema changed or the field is conditionally present.
- **Wrong type:** A string `"42"` where a number `42` is expected -- loose comparison passes, arithmetic fails.
- **Nested structure change:** Upstream refactors `response.data` to `response.result` and downstream code silently reads `undefined`.

---

## String Handling

- **Encoding mismatch:** UTF-8 bytes interpreted as Latin-1 (or vice versa) produce garbled text or comparison failures.
- **Unescaped special characters:** Regex metacharacters, SQL quotes, HTML entities, or shell metacharacters interpreted literally.
- **Case sensitivity:** `"Admin"` vs `"admin"` -- comparison fails, lookup misses, routing breaks.
- **Leading/trailing whitespace:** Input from files, APIs, or user forms often includes invisible whitespace that breaks exact matches.

---

## File System Issues

- **Missing directory:** Writing to a path whose parent directory has not been created yet.
- **Permission denied:** Process lacks read, write, or execute permission on the target path.
- **Path separators:** Concatenating paths with string operations instead of the language's path-join utility.
- **File locking / TOCTOU:** Checking existence then operating on the file -- another process can intervene between the two steps.

---

## Error Handling Gaps

- **Swallowed errors:** An empty `catch` block or a `catch` that only logs -- the caller never learns the operation failed.
- **Wrong catch scope:** A `try` block wraps too much or too little code -- the wrong error gets caught, or the right one escapes.
- **Missing finally / cleanup:** Resources (file handles, connections, locks) not released when an exception interrupts the happy path.
- **Error type confusion:** Catching a generic `Error` when a specific subclass (e.g., `TypeError`, `IOError`) was intended, or vice versa.
- **Re-throw without context:** Catching an error and throwing a new one without preserving the original stack trace or cause.
