# Validation record — v0.5.0

November 15, 2026 (Pacific). The generic source passes 29 Python and 52 JavaScript
tests locally and in GitHub CI. The feature source also passed the complete suite
on Lenovo. Its actual 0.5.0 extension passed locally enabled remote one-minute
start, remote stop with allowance retained, and 30/60-minute bounded requests.

Samsung's separate personal bridge was ported without the generic installer.
Existing token/config files, host permissions, personal identity and start page
were retained; its source passed 27 Python and 52 JavaScript tests. The actual
loaded 0.5.0 extension reconnected to the same work tab. Native popup opt-in,
remote start/stop/restart, native Stop revocation, refused subsequent remote start,
explicit native rearming and a bounded 60-minute request all passed. The Stop
check was performed through the native UI, in addition to race/revocation tests.

These checks do not establish a new 0.5.0 long-duration battery study, full boot
recovery, closed-lid availability or native ChromeOS control by this bridge.
See [remote wake behavior](remote-wake.md) for the exact authority boundaries.

## Previous validation — v0.4.0

November15,2026.27 Python and44 JavaScript tests pass locally and in GitHub CI.
The same complete71-check suite passed as a detached job on the Lenovo at57ca97e.
Tests include permission denial, bounded durations, expiry/status/alarms, storage
and alarm failures, start/stop races, remaining-deadline session restoration,
corrupt/expired state, popup-origin enforcement, Disconnect/banner/tab-loss,
revocation/startup release and refusal of HTTP power-enable commands.

Actual native Chrome0.4.0 on Lenovo reported an owner-enabled1-minute system wake
session active, then inactive after its original deadline. The owner then set
native battery idle behavior to Sleep, kept lid sleep enabled and the lid open,
started15 minutes and left Lenovo untouched. The owner confirmed its display was
off while authenticated SSH/browser observations remained healthy. The request
remained active through its final seconds, then a fresh inactive lease was
observed after the deadline. Battery reported82% at the first active observation
and80% at expiry. No input was generated on Lenovo during the test.

This is sampled availability plus owner visual confirmation, not independent OS
power telemetry, a controlled battery-runtime estimate or uninterrupted-service
proof. No closed-lid override, managed-policy override, critical-battery behavior
or repeated-cycle reliability is claimed. Restart/permission-failure paths are
unit/integration checks, not all physical restart tests.

A fixed-width web preview missed the first native popup's intrinsic-size collapse.
An explicit HTML/body minimum width fixed it; the owner confirmed the full Lenovo
menu. Samsung's native popup was then visually inspected, and wake/stop/disconnect
controls moved into the first view with collapsible persistent settings. Both
actual extensions now report0.4.0; Samsung's wake feature stays off. Personal
pairing files and DeepSeek start page were preserved. Generic installer isolation
and optional-permission/new-file packaging tests pass.

## Previous validation — v0.3.1

November14,2026 (Pacific). A second physical Chromebook (Lenovo, AMD A6-9220C,
4GB RAM, Debian13/x86_64) reproduced a background-tab input bug: click returned
OK without toggling a checkbox. Selecting the work tab made coordinate input work.
The portable0.3.0 install and22Python+17JS tests passed there, plus actual visible
navigation, text/checkbox/select/button, screenshot and390x844 viewport checks.

The0.3.1 change adds explicit connected-tab focus and fails hidden click/type/key
before input. It exposes snapshot visibility and reports visibility loss during
a click as ambiguous. Regression tests cover hidden no-input behavior, explicit
same-target focus, no implicit focus, hidden-window failure, mid-focus connection
change/no replacement targeting, absent connection, and visibility loss during
measurement/press. Python tests cover tool schema/no arbitrary tab ID and an
actual HTTP focus-command roundtrip. All25 Python and26 JavaScript tests pass,
as does GitHub CI.

On November15,2026 the owner reloaded0.3.1 on the Lenovo. The actual hidden
work tab refused click, typing and Enter input; the form remained unchanged.
Explicit focus made the same connected tab visible. Checkbox, select, button and
apostrophe-containing text entry passed, along with390x844/no overflow. Viewport
and original start page were restored. Minimized-window behavior remains covered
only by failure-path unit tests, not a physical live check.

## Previous validation

### v0.3.0

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
