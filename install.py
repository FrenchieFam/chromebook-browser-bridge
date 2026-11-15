#!/usr/bin/env python3
"""Install a personal, locally paired browser bridge. No sudo or package downloads."""
import argparse, ipaddress, json, os, secrets, shlex, shutil, subprocess, sys
from pathlib import Path

RUNTIME=['server.py','client.py','mcp_server.py','doctor.py']
EXTENSION=['manifest.json','worker.js','power.js','popup.js','popup.html','popup.css']
def unit_quote(value):return '"'+str(value).replace('\\','\\\\').replace('"','\\"').replace('%','%%').replace('$','$$')+'"'
def install(args):
 source=Path(__file__).resolve().parent
 home=args.home.expanduser().resolve()
 if (args.start or args.register_codex) and home!=Path.home().resolve():raise ValueError('Starting services or registering Codex requires the actual user home.')
 if args.endpoint_host:host=str(ipaddress.IPv4Address(args.endpoint_host))
 else:
  try:host=str(ipaddress.IPv4Address(json.loads(subprocess.check_output(['ip','-j','route','get','1.1.1.1']))[0]['prefsrc']))
  except (OSError,ValueError,KeyError,IndexError,subprocess.CalledProcessError):raise ValueError('Could not detect Linux IPv4 address. Supply --endpoint-host with the VM IP address.')
 app=home/'.local/share/chromebook-browser-bridge';app.mkdir(parents=True,exist_ok=True)
 config=home/'.config/chromebook-browser-bridge';config.mkdir(mode=0o700,parents=True,exist_ok=True)
 token_file=config/'token'
 if token_file.exists():
  token=token_file.read_text().strip()
  if len(token)<40:raise ValueError('Existing token is too short. Inspect it before choosing to rotate.')
 else:
  token=secrets.token_urlsafe(48)
  fd=os.open(token_file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
  with os.fdopen(fd,'w') as f:f.write(token)
 token_file.chmod(0o600)
 for name in RUNTIME:shutil.copyfile(source/name,app/name)
 ext=args.extension_dir.expanduser().resolve() if args.extension_dir else next((p/'Chromebook-Browser-Bridge' for p in [Path('/mnt/shared/MyFiles/Downloads'),Path('/mnt/chromeos/MyFiles/Downloads')] if p.is_dir()),home/'Downloads/Chromebook-Browser-Bridge')
 ext.mkdir(parents=True,exist_ok=True)
 for name in EXTENSION:shutil.copyfile(source/'extension'/name,ext/name)
 manifest=json.loads((ext/'manifest.json').read_text())
 manifest['host_permissions']=['http://'+host+'/*','http://localhost/*','http://127.0.0.1/*']
 (ext/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (ext/'config.js').write_text('const BRIDGE_URL = '+json.dumps('http://'+host+':8765')+';\nconst BRIDGE_TOKEN = '+json.dumps(token)+';\n')
 (ext/'config.js').chmod(0o600)
 unit_dir=home/'.config/systemd/user';unit_dir.mkdir(parents=True,exist_ok=True)
 (unit_dir/'chromebook-browser-bridge.service').write_text('[Unit]\nDescription=Local selected-tab browser bridge\n\n[Service]\nExecStart='+unit_quote(sys.executable)+' '+unit_quote(app/'server.py')+'\nRestart=on-failure\nRestartSec=3\nNoNewPrivileges=true\nPrivateTmp=true\nUMask=0077\n\n[Install]\nWantedBy=default.target\n')
 bins=home/'.local/bin';bins.mkdir(parents=True,exist_ok=True)
 for name,script in [('chromebook-browser','client.py'),('chromebook-bridge-check','doctor.py')]:
  f=bins/name;f.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(app/script))+' "$@"\n');f.chmod(0o755)
 if args.install_skill:
  skill=home/'.codex/skills/chromebook-browser-bridge';skill.mkdir(parents=True,exist_ok=True)
  shutil.copyfile(source/'skill/SKILL.md',skill/'SKILL.md')
 if args.start:
  subprocess.run(['systemctl','--user','daemon-reload'],check=True)
  subprocess.run(['systemctl','--user','enable','--now','chromebook-browser-bridge.service'],check=True)
  # Apply new runtime sources if this is an upgrade of an already-running service.
  subprocess.run(['systemctl','--user','restart','chromebook-browser-bridge.service'],check=True)
 if args.register_codex:subprocess.run(['codex','mcp','add','chromebook-browser','--',sys.executable,str(app/'mcp_server.py')],check=True)
 print('Installed runtime:',app)
 print('Extension folder:',ext)
 print('Endpoint: http://'+host+':8765')
 print('Pairing token generated or preserved locally; not printed.')
 print('Load/reload the extension in chrome://extensions. Connect this tab for session-only access, or opt into a persistent work tab.')
 if not args.start:print('To start: systemctl --user daemon-reload && systemctl --user enable --now chromebook-browser-bridge.service')
 return {'app':app,'extension':ext,'token_file':token_file}

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--home',type=Path,default=Path.home(),help='Installation home; primarily for isolated testing')
 p.add_argument('--endpoint-host',help='Linux VM IPv4 address reachable from ChromeOS; auto-detected if omitted')
 p.add_argument('--extension-dir',type=Path,help='ChromeOS-accessible unpacked-extension folder')
 p.add_argument('--start',action='store_true',help='Start/enable the current user service')
 p.add_argument('--register-codex',action='store_true',help='Register this local stdio MCP server in Codex')
 p.add_argument('--install-skill',action='store_true',help='Install the optional Codex operating skill')
 try:install(p.parse_args())
 except (OSError,ValueError,subprocess.CalledProcessError) as e:raise SystemExit(str(e))
if __name__=='__main__':main()
