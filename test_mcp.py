import json,unittest
from unittest.mock import patch
import mcp_server as m
class MCPTests(unittest.TestCase):
 def request(self,method,params=None):return m.dispatch({'jsonrpc':'2.0','id':1,'method':method,'params':params or {}})
 def test_initialize(self):
  r=self.request('initialize',{'protocolVersion':'2025-06-18'})['result']
  self.assertEqual(r['protocolVersion'],'2025-06-18');self.assertIn('tools',r['capabilities'])
 def test_unknown_protocol_negotiates_supported(self):self.assertEqual(self.request('initialize',{'protocolVersion':'future'})['result']['protocolVersion'],'2025-06-18')
 def test_notifications_have_no_reply(self):self.assertIsNone(m.dispatch({'jsonrpc':'2.0','method':'notifications/initialized'}))
 def test_list_tools(self):
  ts=self.request('tools/list')['result']['tools'];self.assertEqual(len(ts),10);self.assertEqual(len({t['name'] for t in ts}),10)
 def test_invalid_args_rejected_before_network(self):
  with patch.object(m,'bridge') as b:
   r=self.request('tools/call',{'name':'browser_type','arguments':{'selector':'textarea'}})
   self.assertEqual(r['error']['code'],-32602);b.assert_not_called()
 def test_reject_unsupported_url(self):
  self.assertIn('error',self.request('tools/call',{'name':'browser_navigate','arguments':{'url':'javascript:alert(1)'}}))
 def test_reject_invalid_viewport(self):
  self.assertIn('error',self.request('tools/call',{'name':'browser_viewport','arguments':{'width':True,'height':900}}))
  self.assertIn('error',self.request('tools/call',{'name':'browser_viewport','arguments':{}}))
 def test_screenshot_returns_image(self):
  with patch.object(m,'bridge',return_value={'ok':True,'data':'AA=='}):
   r=self.request('tools/call',{'name':'browser_screenshot'})['result'];self.assertEqual(r['content'][0]['type'],'image');self.assertEqual(r['content'][0]['mimeType'],'image/png')
 def test_bridge_failure_is_tool_error(self):
  with patch.object(m,'bridge',return_value={'ok':False,'error':'No tab'}):
   r=self.request('tools/call',{'name':'browser_click','arguments':{'selector':'button'}})['result'];self.assertTrue(r['isError'])
 def test_no_secret_in_tool_registry(self):self.assertNotIn('Bearer ',json.dumps(m.TOOLS))
if __name__=='__main__':unittest.main()
