# Security and limitations

This is a personal local prototype with powerful selected-tab access. It has not
had an independent security audit and is not designed as a multi-user or public
network service.

## Controls implemented

- Per-install random bearer token; file permissions restrict the local token.
- Token checks on status, commands, polling, results, and heartbeats.
- Browser origins are restricted to extension origins; normal page origins are rejected.
- No unauthenticated remote-debugging socket.
- Only the tab explicitly selected by the owner is attached.
- Disconnect/cancel stops access; explicit stops are not silently reversed.
- A bounded command queue, request-size limit, command expiration, and no automatic retry.
- Stable target measurement and an occlusion check before coordinate clicks.
- Password input typing is refused. Screenshots/page text can still contain sensitive information.
- No arbitrary shell or general JavaScript execution tool in the MCP interface.

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
