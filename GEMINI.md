# Project & Tooling Guidelines: new-agenda

## Tool Discovery & Environment Rules

1. **Verify Installed Software First**:
   - Before deciding any CLI tool is absent, check user directories (`C:\Users\jimco\bin`, `scoop`, `.cargo/bin`, `.local/bin`) and persistent user `PATH`.
   - Prepend `C:\Users\jimco\bin` to `$env:PATH` when using `gh` or other custom CLI tools.

2. **No Autonomous Software Installations**:
   - Never run `winget`, `choco`, `scoop`, or web installer downloads without explicit user approval.

3. **Ask for Help**:
   - If a tool or dependency is not immediately located, ask the user for direction before attempting workarounds.

## Release & Documentation Standards

1. **Version Synchronization**:
   - Increment semantic version in `package.json` and update the badge in `index.html`.

2. **Release Documentation**:
   - Maintain `CHANGELOG.md` following the Keep a Changelog standard.
   - Maintain `RELEASE_NOTES.md` for major user-facing release summaries.
   - Maintain `JOURNAL.md` for architecture devlogs, design rationale, and project milestones.

3. **Git Tagging & GitHub Releases**:
   - Tag releases (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`).
   - Push commits and tags upstream (`git push origin main --tags`).
   - Publish official releases via GitHub CLI (`gh release create vX.Y.Z --notes-file RELEASE_NOTES.md`).

