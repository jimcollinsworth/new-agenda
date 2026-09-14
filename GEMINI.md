# Project & Tooling Guidelines: new-agenda

## Tool Discovery & Environment Rules

1. **Verify Installed Software First**:
   - Before deciding any CLI tool is absent, check user directories (`C:\Users\jimco\bin`, `scoop`, `.cargo/bin`, `.local/bin`) and persistent user `PATH`.
   - Prepend `C:\Users\jimco\bin` to `$env:PATH` when using `gh` or other custom CLI tools.

2. **No Autonomous Software Installations**:
   - Never run `winget`, `choco`, `scoop`, or web installer downloads without explicit user approval.

3. **Ask for Help**:
   - If a tool or dependency is not immediately located, ask the user for direction before attempting workarounds.
