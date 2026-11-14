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
