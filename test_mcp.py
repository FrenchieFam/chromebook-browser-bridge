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
  ts=self.request('tools/list')['result']['tools'];self.assertEqual(len(ts),13);self.assertEqual(len({t['name'] for t in ts}),13)
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

class FocusTests(unittest.TestCase):
 def test_focus_schema_refuses_arbitrary_tab_selection(self):
  with patch.object(m,'bridge') as bridge:
   result=m.dispatch({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'browser_focus','arguments':{'tabId':99}}})
   self.assertIn('error',result);bridge.assert_not_called()
 def test_focus_is_explicit_side_effect_and_forwards_no_target(self):
  with patch.object(m,'bridge',return_value={'ok':True,'focused':True}) as bridge:
   result=m.tool_result('browser_focus',{})
   self.assertFalse(result['isError']);bridge.assert_called_once_with('browser_focus',{})
   self.assertFalse(m.REGISTRY['browser_focus']['annotations']['readOnlyHint'])

class RemoteWakeTests(unittest.TestCase):
 def test_remote_wake_schema_rejects_unbounded_or_policy_arguments(self):
  for args in ({'minutes':0},{'minutes':2},{'minutes':61},{'minutes':True},{'minutes':15,'allowed':True}):
   with self.assertRaises(ValueError):m.validate('browser_wake_start',args)
  for minutes in (1,15,30,60):m.validate('browser_wake_start',{'minutes':minutes})
 def test_remote_wake_tools_do_not_expose_policy_or_permission_grant(self):
  self.assertIn('browser_wake_start',m.REGISTRY);self.assertIn('browser_wake_stop',m.REGISTRY)
  self.assertFalse(m.REGISTRY['browser_wake_start']['annotations']['idempotentHint'])
  self.assertNotIn('browser_wake_remote_policy',m.REGISTRY)

if __name__=='__main__':unittest.main()
