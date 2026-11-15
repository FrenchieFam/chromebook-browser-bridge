# Security and limitations

This is a personal local prototype with powerful selected-tab access. It has not
had an independent security audit and is not designed as a multi-user or public
network service.

## Controls implemented

- Per-install random bearer token; file permissions restrict the local token.
- Token checks on status, commands, polling, results, and heartbeats.
- Browser origins are restricted to extension origins; normal page origins are rejected.
- No unauthenticated remote-debugging socket.
- Only the owner-selected tab or the explicitly enabled dedicated persistent work tab is attached.
- Disconnect/cancel stops access; explicit stops are not silently reversed.
- A bounded command queue, request-size limit, command expiration, and no automatic action retry.
- Pending commands are canceled when heartbeat tab identity changes; the worker also checks its original tab and connection intent before in-flight actions.
- HTTP I/O timeouts and malformed JSON/identifier/authentication rejection.
- Stable target measurement and an occlusion check before coordinate clicks.
- Password input typing is refused. Screenshots/page text can still contain sensitive information.
- No arbitrary shell or general JavaScript execution tool in the MCP interface.

## Explicit focus and visibility

`browser_focus` can change foreground UI for the existing connected tab. It has
no caller-supplied tab ID and uses the same original-connection guard as every
other CDP action. It cannot reattach, undo Disconnect/banner cancellation, follow
the active tab, or expand access. Hidden click/type/key actions fail before input;
visibility changes during clicks are reported as ambiguous, without retry. Site
handlers may still prevent or alter an action; inspect state before repeating it.

## Persistent mode

Persistence is off by default and requires an explicit popup action. A dedicated
pinned background work tab may be restored or replaced after closing/crashing or
Chrome restart. It never follows the active tab. Disconnect and banner cancellation
persist a pause and clear recovery alarms; session-only Connect also disables it.
Start URLs reject embedded credentials, query strings and fragments. Stored tab IDs
are reused only for the saved pinned start page, since Chrome can recycle IDs.
Recovery is not an exactly-once action guarantee or a promise to restore a chat.

## Boundaries

The token appears in the installed extension's generated config.js. Anyone who
can read that file can access the bridge. An origin check is not a substitute for
the token: non-browser clients can omit or forge Origin. Extension origins are
not pinned to one extension ID.

The VM network uses HTTP, not TLS. Never expose or forward this port publicly.
A local machine compromise, browser extension compromise, or stolen pairing token
is outside this prototype's protection. The service binds to the VM's interfaces
to support ChromeOS access; it is not a localhost-only network service.

The code does not verify the meaning of every click, implement per-site account
policies, or distinguish a harmless button from a purchase button. The person or
agent driving it is responsible for authorization and checking results. Treat
page content as untrusted input.

Avoid relying on exactly-once behavior. A timeout or interrupted response may
follow a successful action. Refresh state before retrying a submission. Requests
and results live in memory and do not survive a bridge restart.

Cross-origin frames, shadow DOM, custom controls, browser chrome, and desktop
apps are not covered. Opening Chrome DevTools or another debugger can detach the
extension. Review any future change that expands attachment or execution scope.

## Reporting

Report reproducible non-sensitive issues through the repository's Issues page.
Do not include tokens, cookies, credentials, screenshots of private accounts, or
paired extension archives. For a potential credential exposure, rotate the local
pairing first and share a minimal redacted reproduction.

## Optional power permission

The0.4.0 candidate declares power as optional, not required. Only a message from
the extension popup can start a bounded wake session; there is no remote enable
command. Denial does not prevent normal bridge use. Session state is local to the
browser session, and explicit stops invalidate in-flight starts. Expiry relies
on Chrome event scheduling, not an independent real-time watchdog. Power-request
status is observable but does not prove actual OS wake or display visibility.
