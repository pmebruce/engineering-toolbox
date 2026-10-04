export function combine(levels){if(!levels.length)throw Error('至少一個聲源');const m=Math.max(...levels);return m+10*Math.log10(levels.reduce((s,l)=>s+10**((l-m)/10),0));}
export function evaluateScenario(s,o){
 const num=(v,label,min,max)=>{if(String(v??'').trim()==='')throw Error('請填'+label);const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error(label+'超出範圍');return n;};
 const n=num(s.count,'風扇數量',1,64);if(!Number.isInteger(n))throw Error('數量須為整數');
 const level=num(s.level,'單顆噪音',-30,180);let individual=level;
 if(o.basis==='LpA'){
  const r=num(s.distance,'原量測距離',.01,1000),target=num(o.distance,'評估距離',.01,1000);
  if(o.distanceMode==='free')individual=distanceLevel(level,r,target);
  else if(Math.abs(r-target)>1e-8)throw Error('距離不同：請統一量測距離，或選自由場遠場換算');
 }
 const total=combine(Array(n).fill(individual));
 const q=String(s.flow??'').trim()===''?null:num(s.flow,'單顆工作點風量',0,1e7)*n;
 const required=num(o.flowTarget,'目標風量',0,1e7);
 const limit=o.basis==='LpA'?num(o.limit,'噪音上限',-30,180):null;
 return {total,individual,totalFlow:q,flowPass:q===null?null:q>=required,margin:limit===null?null:limit-total,noisePass:limit===null?null:total<=limit,count:n};
}

export function parseLevels(text){
 const values=String(text).trim().split(/[\s,，;；]+/).filter(Boolean);
 if(!values.length||values.length>64)throw Error('請輸入 1–64 個聲源，每個數值一列。');
 return values.map((v,i)=>{if(!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(v)||!Number.isFinite(Number(v))||Number(v)<-30||Number(v)>180)throw Error(`第 ${i+1} 個聲源需為 −30 至 180 的數值。`);return Number(v);});
}
export function distanceLevel(level,r1,r2){
 if([level,r1,r2].some(v=>String(v??'').trim()===''||!Number.isFinite(Number(v))))throw Error('請填入有效的聲壓與距離。');
 level=Number(level);r1=Number(r1);r2=Number(r2);
 if(level< -30||level>180||r1<=0||r2<=0||r1>1000||r2>1000)throw Error('聲壓需為 −30 至 180 dBA，距離需大於 0 且不超過 1,000 m。');
 return level-20*Math.log10(r2/r1);
}
