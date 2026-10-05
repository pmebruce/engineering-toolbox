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

// A first-pass speed estimate; baseline acoustic and airflow data remain intact.
export function estimateSpeed(s,o){
 if(!s.speedModel||s.speedModel==='off')return null;
 if(o.basis!=='LpA')throw Error('降轉目標需使用 LpA 聲壓資料。');
 const base=evaluateScenario(s,o);
 const valid=(v,label,min,max)=>{if(String(v??'').trim()===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)throw Error('請填有效的'+label);return Number(v);};
 let lower=valid(s.minSpeed??50,'最低轉速比例 (1–100%)',1,100)/100,coefficient=50;
 const rpm=String(s.rpm??'').trim()===''?null:valid(s.rpm,'基準轉速 RPM',1,1e6);
 if(s.speedModel==='calibrated'){
  if(rpm===null)throw Error('兩點校正需填基準轉速 RPM。');
  const rpm2=valid(s.rpm2,'第二點 RPM',1,1e6),level2=valid(s.level2,'第二點單顆 LpA',-30,180);
  if(rpm2>=rpm||level2>=Number(s.level))throw Error('第二點需為較低轉速、較低噪音，且量測條件相同。');
  coefficient=(level2-Number(s.level))/Math.log10(rpm2/rpm);
  lower=Math.max(lower,rpm2/rpm); // Interpolate only inside the provided acoustic range.
 }else if(s.speedModel!=='law')throw Error('未知的降轉估算方式。');
 const ceiling=Math.min(1,10**((Number(o.limit)-base.total)/coefficient));
 const ratio=Math.max(lower,ceiling),total=base.total+coefficient*Math.log10(ratio);
 const totalFlow=base.totalFlow===null?null:base.totalFlow*ratio;
 const noisePass=ceiling>=lower-1e-10,flowPass=totalFlow===null?null:totalFlow+1e-8>=Number(o.flowTarget);
 const needed=base.totalFlow===null?null:base.totalFlow===0?(Number(o.flowTarget)===0?0:Infinity):Number(o.flowTarget)/base.totalFlow;
 return {ratio,rpm:rpm===null?null:rpm*ratio,total,totalFlow,noisePass,flowPass,feasible:noisePass?(flowPass===null?null:flowPass):false,coefficient,lower,ceiling,requiredRatio:needed,margin:Number(o.limit)-total};
}

export function estimateThermalWindow(s,o,t){
 const number=(v,label,min,max)=>{if(String(v??'').trim()===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)throw Error('請填有效的'+label);return Number(v);};
 number(s.rpm,'基準轉速 RPM',1,1e6);number(s.flow,'基準工作點風量',.000001,1e7);
 const inlet=number(t.inlet,'基準入口溫度',-100,500),ambient=number(t.ambient,'基準零件附近空氣溫度',-100,500),component=number(t.component,'基準零件溫度',-100,1000);
 const targetInlet=number(t.targetInlet,'評估入口溫度',-100,500),limit=number(t.limit,'零件溫度上限',-100,1000),exponent=number(t.exponent,'對流指數 (0.1–1)',.1,1);
 if(ambient<inlet||component<=ambient)throw Error('基準零件溫度須高於附近空氣溫度，附近空氣不可低於入口溫度。');
 if(limit<=targetInlet)throw Error('零件溫度上限須高於評估入口溫度。');
 const a=ambient-inlet,b=component-ambient;
 const temperature=ratio=>targetInlet+a/ratio+b/ratio**exponent;
 const acoustic=estimateSpeed(s,{...o,flowTarget:0});
 let thermalRatio=null;
 if(temperature(1)<=limit){let lo=0,hi=1;for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(temperature(mid)>limit)lo=mid;else hi=mid;}thermalRatio=hi;}
 const lower=thermalRatio===null?null:Math.max(thermalRatio,acoustic.lower);
 const feasible=lower!==null&&lower<=acoustic.ceiling+1e-10;
 const ratio=feasible?lower:acoustic.ratio;
 return {acoustic,thermalRatio,thermalRpm:thermalRatio===null?null:thermalRatio*Number(s.rpm),lower,upper:acoustic.ceiling,feasible,ratio,rpm:ratio*Number(s.rpm),temperature:temperature(ratio),totalFlow:acoustic.totalFlow/acoustic.ratio*ratio,noise:acoustic.total+acoustic.coefficient*Math.log10(ratio/acoustic.ratio),inlet:targetInlet+a/ratio,limit,exponent};
}
