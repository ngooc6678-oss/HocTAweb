// Navigation-only fallback. Never caches vocabulary, API responses or sign-in data.
const WAITING_PAGE=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wordnest đang khởi động</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f8f5;color:#203a35;font:16px/1.7 Arial,sans-serif}main{max-width:530px;margin:24px;padding:35px;border:1px solid #dfe6dc;border-radius:16px;background:white}h1{font:32px/1.3 Georgia,serif;margin:16px 0}p{color:#6f8172}small{color:#658560;letter-spacing:2px}button{background:#17584e;color:white;border:0;border-radius:8px;padding:12px 20px;font:inherit;cursor:pointer}#help{display:none;border-top:1px solid #e3e9e5;margin-top:24px;padding-top:18px;font-size:14px}</style></head><body><main><small>WORDNEST</small><h1>Góc học đang mở…</h1><p id="status" role="status">Wordnest đang chờ ứng dụng trên máy sẵn sàng. Trang học sẽ tự mở sau ít giây.</p><button id="retry">Thử lại ngay</button><p id="help">Nếu chờ lâu, nhấp đúp tệp <strong>Mo-Wordnest.cmd</strong> đã được lưu trên máy. Giữ trang này mở, Wordnest sẽ tự kết nối lại.</p></main><script>let checking=false;async function check(){if(checking)return;checking=true;try{const r=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(3000)});const d=await r.json();if(r.ok&&d.app==='wordnest'&&d.status==='ready'){location.reload();return;}}catch{}finally{checking=false;}}document.getElementById('retry').onclick=check;setTimeout(()=>{document.getElementById('help').style.display='block';},30000);setInterval(check,2500);check();</script></body></html>`;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.mode!=='navigate'||event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname!=='/')return;
 event.respondWith((async()=>{
  try{const response=await fetch(event.request,{signal:AbortSignal.timeout(10000)});if(response.status<500)return response;}catch{}
  return new Response(WAITING_PAGE,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 })());
});
