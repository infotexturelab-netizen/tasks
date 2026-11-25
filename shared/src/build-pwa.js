// Builds the standalone PWA from the artifact source into /mnt/project-files/todo-app/pwa/
const fs=require('fs');const {chromium}=require('playwright');
const SRC='/mnt/project-files/shared-app/app.html', OUT=process.env.OUT||'/mnt/project-files/shared-app/pwa/';
const DB_URL=process.env.DB_URL||require('fs').readFileSync('/mnt/project-files/shared-app/db-url.txt','utf8').trim();
fs.mkdirSync(OUT,{recursive:true});
let body=fs.readFileSync(SRC,'utf8').replace('__DB_URL__',DB_URL);
const VERSION=Date.now().toString(36);
const head=`<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="משותף">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
`;
const tail=`
<script>if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));}</script>
</body>
</html>
`;
fs.writeFileSync(OUT+'index.html',head+body+tail);
fs.writeFileSync(OUT+'manifest.webmanifest',JSON.stringify({
  name:"משימות משותפות",short_name:"משותף",lang:"he",dir:"rtl",scope:"./",display:"standalone",
  background_color:"#dfe7ee",theme_color:"#dfe7ee",
  icons:[{src:"icon-192.png",sizes:"192x192",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]
},null,1));
fs.writeFileSync(OUT+'sw.js',`const CACHE="shared-${VERSION}";
const FILES=["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("shared-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const url=new URL(e.request.url);
  if(url.origin===location.origin){
    // network first for the page so updates arrive, cache as fallback offline
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
  } else if(/fonts\\.(googleapis|gstatic)\\.com/.test(url.host)){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return res;})));
  }
});
`);
(async()=>{
  const b=await chromium.launch();const p=await b.newPage();
  for(const n of [180,192,512]){
    await p.setViewportSize({width:n,height:n});
    await p.setContent(`<body style="margin:0"><canvas id=c width=${n} height=${n}></canvas><script>
    const c=document.getElementById('c').getContext('2d'),s=${n}/512;c.scale(s,s);
    c.fillStyle='#cfdde9';c.fillRect(0,0,512,512);
    c.fillStyle='#fffdf8';c.beginPath();c.roundRect(86,70,340,390,26);c.fill();
    c.strokeStyle='#cfe0ee';c.lineWidth=6;for(let y=190;y<=420;y+=70){c.beginPath();c.moveTo(86,y);c.lineTo(426,y);c.stroke();}
    c.strokeStyle='#f2a7b7';c.lineWidth=6;c.beginPath();c.moveTo(366,70);c.lineTo(366,460);c.stroke();
    const cols=['#e5484d','#f5a524','#3fb950','#3b82f6'];
    [155,225,295,365].forEach((y,i)=>{c.strokeStyle=cols[i];c.lineWidth=9;c.fillStyle='#fff';c.beginPath();c.roundRect(300,y-22,44,44,9);c.fill();c.stroke();
      c.fillStyle='#d9d3c5';c.beginPath();c.roundRect(120,y-7,i%2?140:160,14,7);c.fill();});
    c.strokeStyle='#e5484d';c.lineWidth=11;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(308,155);c.lineTo(320,168);c.lineTo(342,140);c.stroke();
    c.fillStyle='#b9a37a';for(let x=120;x<=392;x+=34){c.beginPath();c.roundRect(x,46,10,44,5);c.fill();}
    c.fillStyle='#d9546f';c.beginPath();c.arc(400,420,78,0,7);c.fill();c.fillStyle='#fff';[[372,0],[428,0]].forEach(([x])=>{c.beginPath();c.arc(x,398,17,0,7);c.fill();c.beginPath();c.ellipse(x,452,27,24,0,Math.PI,0);c.fill();});
    </script></body>`);
    await p.waitForTimeout(100);
    await p.locator('#c').screenshot({path:OUT+`icon-${n}.png`});
  }
  await b.close();console.log('built',VERSION);
})();
