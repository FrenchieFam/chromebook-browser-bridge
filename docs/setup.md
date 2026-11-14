# Setup and recovery

The quick-start lives in the README. This guide covers the parts that are easy
to confuse when the browser is in ChromeOS and the tools are inside Linux.

## Network

ChromeOS needs to reach the Linux VM's HTTP port 8765. The installer uses the VM's
current IPv4 address and declares that address in the extension's host permissions.
On the original Chromebook, the numeric VM address worked while the hostname
`penguin.linux.test` did not resolve in a host-side test. This is why the hostname
is not assumed to work everywhere.

Inspect the address with `ip -4 addr show scope global`. Re-run the installer
with `--endpoint-host <VM_IP>` if auto-detection is wrong. Reuse the same
`--extension-dir` if you chose a custom destination. Reload the extension after
regenerating its files.

A numeric IP can change after restarts or VM recreation. This project does not
silently change firewall policy or automatically discover arbitrary remote machines.

## Failed to fetch

1. Run `systemctl --user status chromebook-browser-bridge.service --no-pager`.
2. Run `~/.local/bin/chromebook-bridge-check`.
3. Confirm the extension endpoint matches the current VM IP.
4. Reload the extension after an endpoint/permission change and connect the tab again.
5. If Chrome asks for local network access, decide whether to allow that connection.

An unauthenticated request to the correct `/status` endpoint returns HTTP 403;
that confirms reachability, not a successful pairing. The terminal client's status
request includes the local token. Do not paste the token into a browser address bar.

If another program already owns port 8765, inspect it before starting this service.
The earlier personal `bry-browser-bridge` prototype uses the same port. Do not run
both services simultaneously. Export its documentation, stop that service, and
use the new paired extension when intentionally migrating.

## Chrome's connection

Clicking Connect this tab attaches the debugger only to the active, ordinary web
tab. Canceling the banner disconnects it. No automatic attachment after an explicit
stop is implemented. Loading code into Chrome requires the extension page's
Developer mode switch, not ChromeOS boot Developer Mode.

If you edit the extension source, rerun the installer before reloading Chrome's
installed copy. If you edit the installed copy directly, those edits may be
replaced by the next installer run. Use a source checkout for maintained changes.

## MCP

Registration is equivalent to:

```sh
codex mcp add chromebook-browser -- /usr/bin/python3 "$HOME/.local/share/chromebook-browser-bridge/mcp_server.py"
```

The installer uses the actual Python executable instead of assuming that exact
path. Registration does not start a browser, attach a tab, or change global Codex
permissions. The service and selected tab must be connected for browser commands.

The adapter is a newline-delimited stdio JSON-RPC server. It writes protocol
messages to stdout and returns screenshots as MCP PNG image content. It exposes
no shell-execution tool or arbitrary JavaScript tool.

## Pairing credentials

The installer preserves an existing token. Keep the token file and generated
extension folder private. To rotate after suspected exposure, stop the service,
remove the old token file deliberately, rerun the installer, restart the service,
and reload the extension. Avoid rotating during a running task.

A source backup does not need to include credentials. Reinstalling can generate
new ones. A private complete Linux backup can contain account credentials; treat
it as private account data.

## Cleanup

Stop/disable the service, remove its MCP registration, and remove the Chrome
extension first. Remaining optional files:

- `~/.local/share/chromebook-browser-bridge`
- `~/.config/chromebook-browser-bridge`
- `~/.config/systemd/user/chromebook-browser-bridge.service`
- `~/.local/bin/chromebook-browser`
- `~/.local/bin/chromebook-bridge-check`
- `~/.codex/skills/chromebook-browser-bridge` if installed
- The generated unpacked extension directory printed by the installer

Delete only paths created for this installation, then run
`systemctl --user daemon-reload`. Other projects and Chrome profiles are separate.
