#!/usr/bin/env python3
"""Read-only diagnostics for the portable browser bridge."""
import json,shutil,subprocess
from pathlib import Path
from urllib.parse import urlsplit
from mcp_server import bridge

def report():
 disk=shutil.disk_usage(Path.home())
 try:
  r=subprocess.run(['systemctl','--user','is-active','chromebook-browser-bridge.service'],capture_output=True,text=True,timeout=5)
  service=r.stdout.strip() or 'unavailable'
 except (OSError,subprocess.TimeoutExpired):service='unavailable'
 try:
  s=bridge('browser_status',{});t=s.get('tab',{})
  browser={'reachable':s.get('ok') is not False,'connected':s.get('connected',False),'extensionVersion':t.get('extensionVersion'),'selectedOrigin':urlsplit(t.get('url') or '').netloc,'lastError':t.get('lastError'),'detachReason':t.get('detachReason')}
 except (OSError,ValueError) as e:browser={'reachable':False,'error':str(e)}
 return {'service':service,'browser':browser,'freeGiB':round(disk.free/1024**3,2),'note':'A connected tab requires a user click in the extension. No pairing tokens are printed.'}
if __name__=='__main__':print(json.dumps(report(),indent=2))
