# Chromebook Browser Bridge

**Browser control from Codex on a low-spec Chromebook.**

A small, dependency-free bridge between a Linux terminal and a Chrome tab you
choose. Use it to inspect pages, take screenshots, test forms, and check responsive
layouts. An optional stdio MCP adapter exposes the same actions as agent tools.

Built and tested on a Samsung Chromebook 4 with an Intel Celeron N4020 and 4 GB
RAM. This is an early personal project, tested on one device—not a general
ChromeOS desktop-control system or an official OpenAI/Google integration.

## What works

| Tool | Result |
| --- | --- |
| `browser_status` | Connection state and the selected tab |
| `browser_focus` | Explicitly activate the already-connected tab; no reconnect or target change |
| `browser_snapshot` | Visibility, text, visible control selectors, checkboxes, select options, viewport |
| `browser_screenshot` | PNG of the selected tab |
| `browser_navigate` | Navigate the selected tab |
| `browser_click` | Scroll instantly, wait for a stable target, check for covering elements, click |
| `browser_type` | Replace text in a field; password fields are refused |
| `browser_select` | Select a native dropdown option |
| `browser_scroll` | Scroll by CSS pixels |
| `browser_key` | Enter, Escape, Tab, Backspace, ArrowUp, ArrowDown |
| `browser_viewport` | Set a test viewport or restore the normal view |

The default is session-only: the owner explicitly connects a tab. An optional
persistent mode creates a designated pinned work tab and recovers it when Chrome
or Linux becomes available again. Chrome shows a debugging banner in both modes.
Disconnect or canceling the banner pauses automatic recovery until explicitly
re-enabled. Persistent mode never follows whichever tab you happen to use.

## Visible input and explicit focus (v0.3.1)

A connected background tab can be read without activating it. Coordinate/keyboard
input requires a visible tab: hidden click/type/key actions return an error before
input, rather than reporting success when Chrome silently ignores a click.
Snapshots expose `visibility`. Target visibility is checked while measuring and
again before dispatch; if it changes during a click, the result is ambiguous and
you must inspect before retrying. There is no automatic action retry.

When a foreground action is appropriate, explicitly call `browser_focus` (CLI:
`chromebook-browser focus`). It activates only the existing connected debugger
target and waits for it to become visible. This may bring its Chrome window
forward. It never attaches another tab, resumes an owner pause, or changes the
persistent start page. A minimized/hidden window can still need owner attention.
Click/type/key never implicitly invoke focus. Inspect actual results afterward;
visibility and CDP delivery do not prove a site's business operation completed.

## Requirements

- A Chromebook with the Linux development environment enabled and Chrome 118+.
- Python 3.10+ in Linux; Git to clone the repository.
- Permission to load an unpacked extension. Managed-device policy may prevent it.
- Codex CLI only if you want Codex MCP integration. The terminal client works without it.
- Node.js is optional, for the JavaScript tests. No npm or pip packages are required.

**ChromeOS Developer Mode, host SSH, firmware changes, and root filesystem
changes are not required.** The Developer mode switch on `chrome://extensions`
is a separate extension-development setting.

## Install

In the Linux terminal:

```sh
git clone https://github.com/FrenchieFam/chromebook-browser-bridge.git
cd chromebook-browser-bridge
python3 install.py --start --register-codex --install-skill
```

Omit `--register-codex` and `--install-skill` if you only want the terminal client.
The installer writes to your own home and ChromeOS Downloads; it does not use sudo
or download packages. It creates a random pairing token, a local user service,
terminal launchers, and an unpacked extension folder.

Then in ChromeOS Chrome:

1. Open `chrome://extensions`.
2. Enable the extension page's **Developer mode** toggle.
3. Choose **Load unpacked**, then **Downloads → Chromebook-Browser-Bridge**.
4. Open an ordinary web page.
5. Open **Chromebook Browser Bridge** from the extension menu and choose
   **Connect this tab**. Close the popup.

The installer prints the extension path. If Downloads sharing is different, pass
`--extension-dir /path/to/a/ChromeOS-accessible/folder`. An extension loaded in
ChromeOS must be stored somewhere ChromeOS can read.

The bridge service starts with the Linux user session. It does not boot Linux at
Chromebook startup. Session-only tabs require a new connection; opt-in persistent
work tabs recover after Linux is reachable. Codex may need to
reload its MCP configuration or start a new session to discover a newly added
server. The command-line client remains available immediately.

### Optional persistent work tab

In the extension popup, choose an http/https start page and click **Start
persistent work tab**. The default example page can be changed to the page you
want to work in. Start URLs must not contain credentials, query strings or fragments.

The extension creates one pinned background work tab, checks recovery once a
minute, and attempts recovery after Chrome startup. Linux must be opened first
so the bridge is reachable. Closing the work tab lets persistent mode create a
replacement at the start page. A navigated/restored old work tab may remain beside
that replacement; exact session/conversation restoration is not promised.

**Disconnect and pause automatic recovery** and Chrome's banner Cancel button
both persist a pause. To resume, explicitly start persistent mode again. Choosing
**Connect this tab — this session** disables persistence and connects only that tab.
The added `tabs` permission supports dedicated-tab lookup/creation; `alarms`
schedules recovery. The mode is off until explicitly enabled.

### Try it

```sh
~/.local/bin/chromebook-browser status
~/.local/bin/chromebook-browser snapshot
~/.local/bin/chromebook-browser screenshot --output /tmp/tab.png
~/.local/bin/chromebook-browser select --args '{"selector":"#status","value":"completed"}'
~/.local/bin/chromebook-browser viewport --args '{"width":390,"height":844}'
~/.local/bin/chromebook-browser viewport --args '{"reset":true}'
```

Use real selectors returned by a fresh snapshot. Inspect the result after actions.
Reset viewport emulation after testing. For more commands, run
`~/.local/bin/chromebook-browser --help`.

In Codex, ask it to use the `chromebook-browser` MCP server to check connection,
read the selected test page, and verify one specific interaction.

## How the pieces connect

```mermaid
flowchart LR
  C[Codex] -->|stdio MCP| M[Python adapter]
  T[Terminal client] --> S[Local Python bridge]
  M -->|localhost HTTP| S
  E[Chrome extension] -->|authenticated polling over the VM network| S
  E -->|chrome.debugger| P[User-selected tab]
```

The bridge keeps a small in-memory command queue. The extension polls for a
command, acts on the selected tab, and returns the result. A timeout does not
prove that an action failed; inspect before retrying a submission.

- Installed runtime: `~/.local/share/chromebook-browser-bridge`
- Pairing token: `~/.config/chromebook-browser-bridge/token`
- User service: `chromebook-browser-bridge.service`
- MCP server name: `chromebook-browser`
- Optional skill: `~/.codex/skills/chromebook-browser-bridge`

## Reconnect, update, and remove

After restarting the Chromebook: open Linux. Session-only mode needs a new tab
connection; previously enabled persistent mode retries its designated work tab.
An explicit Disconnect/banner cancellation keeps recovery paused.
If the VM IP changes, rerun the installer from your checkout and reload the
extension. An existing pairing token is preserved. You can specify an IPv4 address
with `--endpoint-host`; the installer otherwise reads the Linux route without
sending a request to that destination.

Update: pull reviewed source changes, rerun the same installer command, reload
the extension, and reconnect a tab. The installer restarts the user service when
`--start` is supplied. Pending commands are lost when that service restarts.

To stop and disable the service:

```sh
systemctl --user disable --now chromebook-browser-bridge.service
codex mcp remove chromebook-browser
```

Remove the unpacked extension in Chrome. See [the setup guide](docs/setup.md)
for remaining file locations, troubleshooting, and optional cleanup.

## Limits and trust

This controls a selected browser tab, including signed-in pages. It does not
control the ChromeOS desktop, system dialogs, other apps, or all your tabs.
Cross-origin iframes, shadow DOM, custom dropdown abstractions, file upload dialogs,
and automatic login are not implemented. File URLs may need Chrome's **Allow
access to file URLs** setting. Internal `chrome://` pages are unsupported.

The service listens on the VM's port 8765 so ChromeOS can reach it. Requests use a
random bearer token; ordinary web-page origins are rejected. The guest-network
transport is HTTP, not TLS. Keep this as a personal local tool: do not forward the
port to the internet or expose it as a public service. See [security notes](SECURITY.md).

`config.js` contains a pairing token and is generated locally. **Never publish a
paired extension folder.** This repository ships only an example configuration.
Model outputs and page text still require judgment; browser access doesn't make
website content trustworthy or remove account authorization requirements.

## Tests and experience

```sh
python3 -m unittest discover -p 'test_*.py' -v
node --test test_worker.cjs test_persistence.cjs test_input_visibility.cjs
```

The source tests cover HTTP authentication/origins, command/result delivery,
MCP messages and tool arguments, installer token preservation, click guards,
persistence recovery, explicit pauses, and queued/in-flight connection changes.
The original live setup also passed dropdown/checkbox interactions, screenshots,
and 390×844 / 1280×900 viewport checks on its test site.

The portable installer is tested in an isolated temporary home; broader-device
installation testing is still welcome. [Read the build story](docs/build-story.md)
and [the specific validation record](docs/validation.md).

## License

[MIT](LICENSE). Built by [FrenchieFam](https://github.com/FrenchieFam).

## Optional timed keep-awake (0.4.0 candidate)

The popup offers an explicit1/15/30/60-minute system wake session with countdown
and Stop. Power is an optional permission requested only on Enable. Disconnect
and tab loss release it; it does not change ChromeOS power/lock preferences or
promise closed-lid availability. See [behavior and validation](docs/keep-awake.md).
Hardware validation is pending; the current release remains0.3.1 until verified.
