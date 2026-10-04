export function combine(levels){if(!levels.length)throw Error('至少一個聲源');const m=Math.max(...levels);return m+10*Math.log10(levels.reduce((s,l)=>s+10**((l-m)/10),0));}
export function evaluateScenario(s,o){
 const num=(v,label,min,max)=>{if(String(v??'').trim()==='')throw Error('請填'+label);const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+'超出範圍');return n;};
 const n=num(s.count,'風扇數量',1,64);if(!Number.isInteger(n))throw Error('數量須為整數');
 const level=num(s.level,'單顆噪音',-30,180);let individual=level;
 if(o.basis==='LpA'){
  const r=num(s.distance,'原量測距離',.01,1000),target=num(o.distance,'評估距離',.01,1000);
  if(o.distanceMode==='free')individual-=20*Math.log10(target/r);
  else if(Math.abs(r-target)>1e-8)throw Error('距離不同：請統一量測距離，或選自由場遠場換算');
 }
 const total=combine(Array(n).fill(individual));
 const q=String(s.flow??'').trim()===''?null:num(s.flow,'單顆工作點風量',0,1e7)*n;
 const required=num(o.flowTarget,'目標風量',0,1e7);
 const limit=o.basis==='LpA'?num(o.limit,'噪音上限',-30,180):null;
 return {total,individual,totalFlow:q,flowPass:q===null?null:q>=required,margin:limit===null?null:limit-total,noisePass:limit===null?null:total<=limit,count:n};
}
