# I turned an old Chromebook into a small AI workbench

My main PCs stopped working, so I started working from a Samsung Chromebook 4:
a Celeron N4020, about 4 GB of RAM, and its Linux development environment.

I could already ask Codex to write files and run terminal commands. What I wanted
next was a practical way to let it check the pages it built in the Chrome browser
I was using. That became this bridge.

## The useful boundary

ChromeOS Chrome and the Linux environment are separate. A terminal tool inside
Linux doesn't automatically see the ChromeOS desktop. More shell permissions
alone didn't give the model a screenshot or a way to click a page.

The connection we built has two ends: a small Python server in Linux and an
unpacked Chrome extension in ChromeOS. I pick a tab and connect it. The extension
uses Chrome's debugger API to inspect that tab and execute a small set of actions.
An MCP adapter gives Codex named tools for those same actions.

The browser bridge itself doesn't require ChromeOS Developer Mode or host SSH.
We explored host access separately; it isn't part of this project's installation.

## What we actually tried

We started by reading a page and taking a screenshot. Then we tested a small
missed-call response simulation: type an example business name, change the call
outcome, toggle the opt-out condition, and inspect the draft or blocked result.
No real phone service or text messaging was connected.

One failure was instructive: smooth scrolling moved a control between measuring
its location and clicking it. The bridge now scrolls instantly, waits for a stable
rectangle, and checks whether another element covers the intended target.

Another failure was the VM hostname. The numeric guest address was reachable,
so the installer now detects that address and creates a matching extension
configuration. It still needs to be regenerated if the VM address changes.

We also tested phone and desktop viewport emulation. Those checks let us inspect
and publish a lightweight static portfolio without installing another browser in
Linux. The actual browser was already there.

## Where this could help

- Checking forms and responsive layouts on a personal static site.
- Letting an agent verify its own browser-visible changes.
- Learning how Chrome extensions, CDP, HTTP queues, and MCP fit together.
- Reusing an older Chromebook as a terminal-first development machine.

It controls the selected browser tab. It doesn't operate the whole Chromebook,
keep an AI working after its session ends, bypass sign-in, or turn a local computer
into a reliable always-on production server.

## What it costs to run

The bridge uses the Python standard library and Chrome's existing extension APIs.
There is no bridge subscription, telephony account, or hosted API dependency.
Codex or another agent can have its own account and usage requirements. That is
separate from this software's runtime.

## Next steps worth testing

More reliable recovery reporting, additional real-world pages, better accessibility
inspection, and careful frame support are useful directions. Broader access should
come with clear behavior and tests. For now, the most useful result is a setup I
can understand, reproduce, and disconnect.

Built with hands-on testing and AI assistance. The validation record documents
what was tested and what remains open.
