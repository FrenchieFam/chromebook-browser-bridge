#!/usr/bin/env python3
import argparse, base64, json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
p=argparse.ArgumentParser(description='Operate only the Chrome tab selected in Chromebook Browser Bridge.')
p.add_argument('action', choices=['wake_start','wake_stop','focus','status','snapshot','screenshot','navigate','click','type','scroll','key','select','viewport'])
p.add_argument('--args',default='{}',help='JSON action arguments; do not put passwords here')
p.add_argument('--output',type=Path,help='Save screenshot as PNG instead of printing image data')
a=p.parse_args()
token=(Path.home()/'.config/chromebook-browser-bridge/token').read_text().strip()
args=json.loads(a.args)
if a.action=='screenshot' and not a.output:p.error('screenshot requires --output /path/to/image.png')
data=None if a.action=='status' else json.dumps({'action':a.action,'args':args}).encode()
r=Request('http://127.0.0.1:8765/'+('status' if data is None else 'command'),data=data,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
try:
 with urlopen(r,timeout=45) as response: result=json.load(response)
except HTTPError as e:
 print(e.read().decode());raise SystemExit(1)
except OSError as e:
 print('Bridge unavailable:',e);raise SystemExit(1)
if a.action=='screenshot' and result.get('ok') and result.get('data'):
 a.output.write_bytes(base64.b64decode(result.pop('data'),validate=True));result['savedTo']=str(a.output)
print(json.dumps(result,indent=2))
if result.get('ok') is False:raise SystemExit(1)
