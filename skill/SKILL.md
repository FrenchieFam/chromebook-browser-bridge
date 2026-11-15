---
name: chromebook-browser-bridge
description: Operate a Chrome tab explicitly connected through the local Chromebook Browser Bridge MCP server, or diagnose that bridge. Use only where this bridge is installed; it does not provide ChromeOS desktop control.
---

# Chromebook Browser Bridge

Use its `browser_status` tool first to identify the selected tab and bridge version.
If MCP tools are unavailable, use `~/.local/bin/chromebook-browser status` and
`~/.local/bin/chromebook-browser snapshot` through the terminal.
The bridge controls the owner-selected tab or an explicitly enabled dedicated
persistent work tab. Persistent mode never follows the owner's active tab.

When disconnected, inspect status first. Enabled persistent mode may be waiting
for Linux; an explicit Disconnect or banner cancellation persists a pause. For
session-only access the owner opens the intended page and clicks Connect this tab.
For recovery they explicitly choose a start page and Start persistent work tab. Do not silently attach another tab or reattach after
the user cancels Chrome's debugger banner. For diagnostics, use
`~/.local/bin/chromebook-bridge-check`.

For extension0.3.1+, a snapshot includes visibility. Hidden click/type/key input
is refused. When showing the connected tab is appropriate for the owner's task,
use `browser_focus` (CLI `chromebook-browser focus`), then inspect a fresh snapshot.
Focus changes only the existing connected target; it never reconnects or resumes
a paused owner connection. Do not use it to undo a stop or take over a different
tab. If visibility changes during input, inspect the outcome before retrying.

A snapshot returns page text, viewport dimensions, and CSS selectors. Obtain new
selectors after navigation or DOM changes. Check state after mutations. A timeout
can occur after a click took effect; inspect before retrying a submission.
Use `browser_select` for native dropdowns; custom dropdowns need ordinary page
interaction. Use `browser_viewport` for responsive checks and reset it afterward.
Cross-origin iframes, shadow DOM, internal Chrome pages, and the ChromeOS desktop
are not implemented. Login passwords are entered by the user in Chrome.

The service starts with the Linux user session, not automatically at Chromebook
boot. Source installation is under `~/.local/share/chromebook-browser-bridge`.
Runtime changes need a user-service restart. Extension changes need Reload in
`chrome://extensions`; inspect status after reloading and honor any saved pause.
Persistent mode needs Linux running and may create a replacement start-page tab;
do not assume it restores the exact previous page or conversation.

The extension's config.js and `~/.config/chromebook-browser-bridge/token` contain
local pairing credentials. Keep them out of public repositories and shared demos.
After a VM IP change, rerun the installer with the same extension destination,
then reload the extension; the installer preserves an existing pairing token.

## Owner-enabled keep-awake

Version 0.4.0 adds an optional timed system-wake session in the extension popup.
The owner enables it and grants optional power permission there; the Linux/MCP
interface cannot enable or extend it. Status can report the active lease/deadline.
Do not equate that field with measured OS wake, screen visibility or closed-lid
availability. Honor Stop/Disconnect. Keep normal screenshot/visibility checks for
browser input even when a wake session is active. Chrome power/lock settings are
separate. Never use input loops to manufacture activity or bypass a stop.
