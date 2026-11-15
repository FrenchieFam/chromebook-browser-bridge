import json, threading, unittest
from urllib.request import Request, build_opener, ProxyHandler
from urllib.error import HTTPError
from server import Server, State

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.state=State('test-token-not-a-real-credential')
        self.server=Server(('127.0.0.1',0),self.state)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.url='http://127.0.0.1:'+str(self.server.server_address[1])
        self.opener=build_opener(ProxyHandler({}))
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join()
    def call(self,path,body=None,token=None,origin=None):
        headers={'Authorization':'Bearer '+(token or self.state.token),'Content-Type':'application/json'}
        if origin:headers['Origin']=origin
        data=None if body is None else json.dumps(body).encode()
        request=Request(self.url+path,data=data,headers=headers)
        try:
            with self.opener.open(request,timeout=3) as r:return r.status,json.load(r)
        except HTTPError as e:return e.code,json.load(e)
    def test_wake_is_observable_and_only_known_power_actions_are_exposed(self):
        wake={'active':True,'expiresAt':123456,'remainingSeconds':60,'level':'system'}
        self.call('/heartbeat',{'tabId':7,'wake':wake})
        self.assertEqual(self.call('/status')[1]['tab']['wake'],wake)
        for action in ('wake-remote-policy','grant-power-permission'):
            self.assertEqual(self.call('/command',{'action':action,'args':{'minutes':60}})[0],400)
    def test_legacy_heartbeat_does_not_invent_a_wake_session(self):
        self.call('/heartbeat',{'tabId':7,'extensionVersion':'0.3.1'})
        self.assertIsNone(self.call('/status')[1]['tab']['wake'])
    def test_missing_connection(self):
        self.assertFalse(self.call('/status')[1]['connected'])
        self.assertEqual(self.call('/command',{'action':'snapshot'})[0],409)
    def test_wrong_token(self):
        self.assertEqual(self.call('/status',token='wrong')[0],403)
    def test_web_page_origin_rejected(self):
        self.assertEqual(self.call('/status',origin='https://example.com')[0],403)
        self.assertEqual(self.call('/status',origin='null')[0],403)
    def test_extension_origin_allowed(self):
        self.assertEqual(self.call('/status',origin='chrome-extension://'+'a'*32)[0],200)
    def test_unknown_action_rejected(self):
        self.assertEqual(self.call('/command',{'action':'shell','args':{}})[0],400)
    def test_command_roundtrip(self):
        self.call('/heartbeat',{'tabId':7,'title':'Mock test','url':'https://example.test'})
        self.assertTrue(self.call('/status')[1]['connected'])
        output=[]
        t=threading.Thread(target=lambda:output.append(self.call('/command',{'action':'snapshot','args':{}})))
        t.start()
        job=self.state.jobs.get(timeout=2)
        self.call('/result',{'id':job['id'],'result':{'ok':True,'text':'Mock page'}})
        t.join(3)
        self.assertEqual(output,[(200,{'ok':True,'text':'Mock page'})])
        self.assertEqual(self.state.pending,{})
    def test_disconnected_tab_disables_commands(self):
        self.call('/heartbeat',{'tabId':None})
        self.assertEqual(self.call('/command',{'action':'click','args':{'selector':'button'}})[0],409)
    def test_orphan_result_not_accepted(self):
        self.assertFalse(self.call('/result',{'id':'missing','result':{'ok':True}})[1]['accepted'])
    def test_focus_command_roundtrip(self):
        self.call('/heartbeat',{'tabId':7})
        output=[]
        thread=threading.Thread(target=lambda:output.append(self.call('/command',{'action':'focus','args':{}})))
        thread.start();job=self.state.jobs.get(timeout=2)
        self.assertEqual(job['action'],'focus')
        self.call('/result',{'id':job['id'],'result':{'ok':True,'focused':True,'visibility':'visible'}})
        thread.join(3);self.assertTrue(output[0][1]['focused'])
    def test_malformed_inputs_rejected_without_crashing(self):
        for path,body in [('/result',{'id':[]}),('/command',{'action':[]}),('/heartbeat',{'tabId':[]})]:
            self.assertEqual(self.call(path,body)[0],400)
        self.assertEqual(self.call('/status',token='é')[0],403)
    def test_queued_command_cannot_follow_connection_change(self):
        self.call('/heartbeat',{'tabId':7})
        output=[]
        thread=threading.Thread(target=lambda:output.append(self.call('/command',{'action':'snapshot'})))
        thread.start()
        job=self.state.jobs.get(timeout=2)
        self.state.jobs.put(job)
        self.call('/heartbeat',{'tabId':None})
        self.call('/heartbeat',{'tabId':8})
        thread.join(3)
        self.assertFalse(output[0][1]['ok'])
        self.assertIsNone(self.call('/poll')[1]['job'])

if __name__=='__main__':unittest.main()
