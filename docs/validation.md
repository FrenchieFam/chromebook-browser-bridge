# Validation record — v0.3.0 candidate

Date: 2026-11-14.

Validation: 22 Python tests and 17 JavaScript tests pass. Worker/popup syntax
checks and bundled skill validation pass. Installer tested in an isolated home,
including private config permissions and token preservation.

## Current changes

- Optional persistent pinned work tab; session-only remains the default.
- Disconnect/banner cancellation pause recovery persistently.
- Worker actions remain bound to their starting tab/connection intent.
- Server cancels pending commands when heartbeat tab identity changes.
- HTTP timeouts and malformed request/authentication handling.
- Generic start URL, no personal endpoints or generated pairing configs.
- Isolated installer checks pairing config/token permissions and token retention.

The personal 0.3.0 extension was reloaded and its connected version, status and
snapshot verified on the original Chromebook. The public variant is generalized
and tested in isolation; it has not replaced that live installation. After one full Chromebook reboot and opening Linux, the personal extension
automatically recovered a designated pinned start-page tab; authenticated status
and a page snapshot confirmed access. It was initially disconnected and recovered
on a subsequent check without a reconnect click. This verifies one reboot of
the personal setup, not a fresh portable installation or repeated-cycle reliability. This is
not an unattended-operation or exact-session-restoration guarantee.

## Previous v0.2.0 validation

### Original record — v0.2.0

Date: 2026-11-14.

## Portable source package

- 20 Python unittest cases passed.
- 5 Node.js click-guard cases passed.
- Worker and popup JavaScript syntax checked.
- Optional Codex skill passed its frontmatter/scaffold validator.
- Installer ran in an isolated temporary home, including paths with spaces.
- Installer generated a private pairing token and a matching extension config.
- Reinstall preserved that token and did not print it.
- Runtime, launchers, service definition, extension, and optional skill were created.
- An invalid endpoint address was rejected.
- Publication scan checked for the live prototype token, GitHub token patterns,
  private SSH keys, and personal absolute paths. None were found in the release source.

## Original live Chromebook setup

Samsung Chromebook 4, Intel Celeron N4020, approximately 4 GB host RAM; Debian
Linux user environment and ChromeOS Chrome. Extension version 0.2.0.

Verified through the actual browser:

- Read selected-tab title, URL, text, and control selectors.
- Captured PNG screenshots.
- Navigated between a public page, a local test server, and the owner's site.
- Replaced text and confirmed the draft response used it.
- Clicked checkboxes and confirmed their checked state and changed result.
- Selected a native dropdown and confirmed the selected value and changed result.
- Set 390×844 and 1280×900 viewport overrides; page width matched, without overflow.
- Reset emulation and restored example form state after testing.
- Submitted an owner-authorized technical summary to another chat model and read
  its response. No credential or private backup was included in that prompt.
- Ran an actual stdio MCP initialization, discovery, and authenticated status check.

The portable package uses the same bridge/extension logic with generic installation
paths. Its installer has not been tested on a second physical Chromebook. It was
not installed over the original working personal service during packaging.

## Still open

- Broader Chromebook/Chrome/Linux combinations and managed-device restrictions.
- Cross-origin iframe and shadow DOM support.
- Custom dropdowns and file upload dialogs.
- Longer tasks, sleep/wake behavior, abrupt Chrome shutdown, and VM-address changes
  across multiple actual reboot cycles.
- Independent security review and accessibility review of the extension UI.
- Native Codex tool discovery after every client's particular MCP reload behavior.

There is no claim of reliable unattended 24/7 operation, full desktop control,
production messaging, or exactly-once browser mutations.
