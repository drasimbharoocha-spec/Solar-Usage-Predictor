import fs from 'fs';
const {topic:T,cfg:C}=JSON.parse(process.env.SRP_CONFIG);
const J=async u=>{const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()};
const pt=(s,o)=>{const a=s.match(/\d+/g);return Date.UTC(+a[0],a[1]-1,+a[2],+a[3],+a[4])-o*1e3};
const B='https://api.open-meteo.com/v1/forecast?latitude='+C.lat+'&longitude='+C.lon+'&timezone=auto&forecast_days=2';
const w=await J(B+'&hourly=global_tilted_irradiance,temperature_2m&tilt='+C.tilt+'&azimuth='+(C.az-180));
const ts=w.hourly.time.map(s=>pt(s,w.utc_offset_seconds)-18e5),G=w.hourly.global_tilted_irradiance,Tm=w.hourly.temperature_2m;
const ip=(a,t)=>{const n=ts.length;if(t<=ts[0])return a[0];if(t>=ts[n-1])return a[n-1];const i=Math.floor((t-ts[0])/36e5),f=(t-ts[i])/36e5,x=a[i],y=a[i+1];return x==null||y==null?(x??y):x+(y-x)*f};
const pw=(g,ta)=>g>0?Math.max(0,Math.min(C.kwp*g*(1-.004*(ta+.03*g-25))*C.ef/100,C.inv)):0;
const now=Date.now(),P=t=>pw(ip(G,t),ip(Tm,t));
let spd=.3;
try{const x=await J(B+'&hourly=shortwave_radiation&models=icon_seamless,gfs_seamless,ecmwf_ifs025');
const ks=Object.keys(x.hourly).filter(k=>k.startsWith('shortwave_radiation'));let s=0,c=0;
x.hourly.time.forEach((e,i)=>{const t=pt(e,x.utc_offset_seconds);if(t<now-36e5||t>now+108e5)return;
const v=ks.map(k=>x.hourly[k][i]).filter(y=>y!=null);if(v.length<2)return;
s+=(Math.max(...v)-Math.min(...v))/(v.reduce((a,b)=>a+b)/v.length+50);c++});if(c)spd=Math.min(1,s/c)}catch{}
const gv=[0,18e5,36e5].map(d=>ip(G,now+d)),vh=(Math.max(...gv)-Math.min(...gv))/(Math.max(...gv)+50);
const conf=Math.max(.05,1-Math.min(.75,.8*spd+.5*vh)),mg=.1+(1-conf)*.5;
let pp=1e9;for(let i=0;i<=4;i++)pp=Math.min(pp,P(now+i*9e5)*(1-mg));
const md=pp>=C.hv?2:pp>=C.nl?1:0,names=['SAVE POWER','NORMAL USE','HEAVY OK'];
const info='Solar about '+Math.round(P(now))+' W now, '+Math.round(P(now+36e5))+' W in 1 h.';
const push=(title,body,pri,tags)=>fetch('https://ntfy.sh/'+T,{method:'POST',headers:{Title:title,Priority:String(pri),Tags:tags},body});
let {mode=null,pend=null,n=0,sent=0}=fs.existsSync('state.json')?JSON.parse(fs.readFileSync('state.json','utf8')):{};
if(mode===null){mode=md;sent=now;await push('Solar alerts are on','Current solar mode: '+names[md]+'. '+info,3,'sunny')}
else if(md===mode){pend=null;n=0}
else{
if(pend===md)n++;else{pend=md;n=1}
if(n>=(md<mode?1:2)&&now-sent>9e5){
await push(names[md],(md<mode?'Solar has dropped. ':'Solar has improved. ')+info,md<mode?4:3,md<mode?'warning':'sunny');
mode=md;pend=null;n=0;sent=now}}
fs.writeFileSync('state.json',JSON.stringify({mode,pend,n,sent}));
console.log(names[md],info,'confidence',Math.round(conf*100));
