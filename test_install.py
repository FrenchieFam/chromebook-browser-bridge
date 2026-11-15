import argparse,contextlib,io,json,stat,tempfile,unittest
from pathlib import Path
import install
class InstallerTests(unittest.TestCase):
 def test_isolated_install_preserves_token_and_generates_pair(self):
  with tempfile.TemporaryDirectory(prefix='bridge install ') as tmp:
   home=Path(tmp)/'home';ext=Path(tmp)/'Chrome Downloads/Extension'
   args=argparse.Namespace(home=home,extension_dir=ext,endpoint_host='127.0.0.1',start=False,register_codex=False,install_skill=True)
   out=io.StringIO()
   with contextlib.redirect_stdout(out):first=install.install(args)
   token=first['token_file'].read_text()
   self.assertGreaterEqual(len(token),40);self.assertNotIn(token,out.getvalue())
   self.assertIn(token,(ext/'config.js').read_text())
   self.assertEqual(stat.S_IMODE(first['token_file'].stat().st_mode),0o600)
   self.assertEqual(stat.S_IMODE((ext/'config.js').stat().st_mode),0o600)
   self.assertIn('alarms',json.loads((ext/'manifest.json').read_text())['permissions'])
   self.assertEqual(json.loads((ext/'manifest.json').read_text())['version'],'0.3.1')
   self.assertTrue((first['app']/'mcp_server.py').is_file())
   self.assertTrue((home/'.codex/skills/chromebook-browser-bridge/SKILL.md').is_file())
   self.assertIn('bridge install ',(home/'.config/systemd/user/chromebook-browser-bridge.service').read_text())
   with contextlib.redirect_stdout(io.StringIO()):install.install(args)
   self.assertEqual(first['token_file'].read_text(),token)
 def test_invalid_address_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   args=argparse.Namespace(home=Path(tmp),extension_dir=None,endpoint_host='https://not-an-ip',start=False,register_codex=False,install_skill=False)
   with self.assertRaises(ValueError):install.install(args)
if __name__=='__main__':unittest.main()
