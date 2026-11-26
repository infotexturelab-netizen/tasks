// Builds the standalone PWA from the artifact source into /mnt/project-files/todo-app/pwa/
const fs=require('fs');const {chromium}=require('playwright');
const SRC='/mnt/project-files/album-app/app.html', OUT=process.env.OUT||'/mnt/project-files/album-app/pwa/';
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
<meta name="apple-mobile-web-app-title" content="האלבום">
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
  name:"האלבום שלנו",short_name:"האלבום",lang:"he",dir:"rtl",scope:"./",display:"standalone",
  background_color:"#e6def0",theme_color:"#e6def0",
  icons:[{src:"icon-192.png",sizes:"192x192",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png"},{src:"icon-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]
},null,1));
fs.writeFileSync(OUT+'sw.js',`const CACHE="album-${VERSION}";
const FILES=["./","index.html","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("album-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
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
  const b=await chromium.launch();const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>console.log('LOG',m.text()));
  for(const n of [180,192,512]){
    await p.setViewportSize({width:n,height:n});
    await p.setContent(`<body style="margin:0"><canvas id=c width=${n} height=${n}></canvas><script>{
    const c=document.getElementById('c').getContext('2d'),s=${n}/512;c.scale(s,s);
    c.fillStyle='#d9cdea';c.fillRect(0,0,512,512);
    c.fillStyle='#fffdf8';c.beginPath();c.roundRect(86,70,340,390,26);c.fill();
    c.strokeStyle='#e3d9f0';c.lineWidth=6;for(let y=190;y<=420;y+=70){c.beginPath();c.moveTo(86,y);c.lineTo(426,y);c.stroke();}
    c.strokeStyle='#f2a7b7';c.lineWidth=6;c.beginPath();c.moveTo(366,70);c.lineTo(366,460);c.stroke();
    c.fillStyle='#b9a37a';for(let x=120;x<=392;x+=34){c.beginPath();c.roundRect(x,46,10,44,5);c.fill();}
    // vinyl record
    c.fillStyle='#2b2a33';c.beginPath();c.arc(236,250,128,0,7);c.fill();
    c.strokeStyle='rgba(255,255,255,.13)';c.lineWidth=3;[110,94,78].forEach(r=>{c.beginPath();c.arc(236,250,r,0,7);c.stroke();});
    c.fillStyle='#e5484d';c.beginPath();c.arc(236,250,40,0,7);c.fill();
    c.fillStyle='#fffdf8';c.beginPath();c.arc(236,250,8,0,7);c.fill();
    // music note badge
    c.fillStyle='#7c5cc4';c.beginPath();c.arc(400,420,78,0,7);c.fill();
    c.fillStyle='#fff';c.strokeStyle='#fff';c.lineWidth=11;c.lineCap='round';
    c.beginPath();c.ellipse(380,448,19,15,-0.4,0,7);c.fill();c.beginPath();c.moveTo(396,442);c.lineTo(396,378);c.lineTo(430,392);c.stroke();
    }</script></body>`);
    await p.waitForTimeout(100);
    await p.locator('#c').screenshot({path:OUT+`icon-${n}.png`});
  }
  await b.close();console.log('built',VERSION);
})();
