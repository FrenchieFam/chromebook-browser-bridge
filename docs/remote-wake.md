# Remote timed sessions — v0.5.0

This extends0.4.0's owner-only timer to paired Linux/CLI/MCP clients after the
owner enables **Allow remote timed sessions** in the device's extension popup.
It is off by default for an existing or new installation. The popup handles
Chrome's optional power-permission grant; remote commands cannot grant permission
or alter the remote-control policy.

```sh
chromebook-browser wake_start --args '{"minutes":30}'
chromebook-browser wake_stop
```

MCP equivalents are browser_wake_start(minutes) and browser_wake_stop(). Each
start/renewal explicitly chooses1,15,30 or60 minutes. There is no automatic renewal
loop, indefinite duration, native settings modification or sleep/wake bypass.
The Linux environment and connected extension must already be reachable; this
cannot wake a sleeping or powered-off Chromebook.

The remote allowance persists across normal browser restarts, but an active timer
does not. Owner popup Stop, unticking the checkbox, Disconnect/banner cancellation
or power-permission removal revoke remote authority and release wake. A remote
stop or ordinary expiry releases only the current timer, preserving the owner's
allowance for later tasks. Remote start races with owner Stop are rejected.

Tab loss releases the active lease. Ordinary persistent work-tab recovery may
restore browser access, but does not itself start another wake request. Existing
connection-intent guards and queued-command cancellation still apply.

Security boundary: this is a personal paired bearer-token prototype. Enabling
remote timed sessions lets anyone holding that device's bridge token request
bounded system wake sessions while connected. Keep the token private and do not
expose the bridge publicly. It grants no new native desktop controls or broad
JavaScript/shell tool. See SECURITY.md for the existing network/account limits.

Validation: 29 Python and 52 JavaScript tests pass locally and in GitHub CI.
On Lenovo, native reload and local opt-in plus actual remote one-minute start,
remote stop preserving the allowance, and 30/60-minute starts passed. The Samsung
personal installation was ported separately while preserving its pairing and
start page: 27 Python and the same 52 JavaScript tests passed. Its actual native
0.5.0 popup was used to allow remote sessions, start remotely, stop remotely,
restart remotely, and then press native Stop. Status showed the allowance revoked
and the next remote start was refused. The test allowance was then explicitly
restored through the native popup and a bounded 60-minute request succeeded.

These are real browser checks plus the earlier 0.4.0 one-minute expiry and
15-minute screen-off observation; they do not establish unattended boot recovery,
closed-lid operation or native desktop control. Native support through another
product is separate from this bridge and is not packaged here.
