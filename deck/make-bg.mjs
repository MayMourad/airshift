// Renders the deck background (midnight gradient, glow, scientific grid, sparse particles) to assets/bg.png
import { chromium } from '../app/node_modules/playwright/index.mjs'
const html = `<html><body style="margin:0"><canvas id=c width=1920 height=1080></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');
let s=7;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};
let g=x.createLinearGradient(0,0,0,1080);g.addColorStop(0,'#071622');g.addColorStop(.55,'#08202e');g.addColorStop(1,'#071622');x.fillStyle=g;x.fillRect(0,0,1920,1080);
let a=x.createRadialGradient(1500,200,0,1500,200,800);a.addColorStop(0,'rgba(22,214,188,.16)');a.addColorStop(1,'rgba(22,214,188,0)');x.fillStyle=a;x.fillRect(0,0,1920,1080);
a=x.createRadialGradient(200,1000,0,200,1000,700);a.addColorStop(0,'rgba(87,200,232,.12)');a.addColorStop(1,'rgba(87,200,232,0)');x.fillStyle=a;x.fillRect(0,0,1920,1080);
x.strokeStyle='rgba(87,200,232,.05)';x.lineWidth=1;for(let i=0;i<=1920;i+=60){x.beginPath();x.moveTo(i,0);x.lineTo(i,1080);x.stroke()}for(let j=0;j<=1080;j+=60){x.beginPath();x.moveTo(0,j);x.lineTo(1920,j);x.stroke()}
for(let i=0;i<170;i++){const px=r()*1920,py=r()*1080,pr=r()<.15?2.4:1.1,t=r()<.7?'22,214,188':'87,200,232';x.fillStyle='rgba('+t+','+(.15+r()*.3)+')';x.beginPath();x.arc(px,py,pr,0,7);x.fill()}
</script></body></html>`
const b = await chromium.launch({ channel: 'msedge' })
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage()
await p.setContent(html)
await p.locator('#c').screenshot({ path: 'assets/bg.png' })
await b.close()
console.log('bg ok')
