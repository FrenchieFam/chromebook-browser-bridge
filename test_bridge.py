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

if __name__=='__main__':unittest.main()
