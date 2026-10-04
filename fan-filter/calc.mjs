export const FLOW={CFM:0.0004719474432,'m3/h':1/3600,'L/s':0.001,'m3/s':1};
export const PRESSURE={Pa:1,kPa:1000,mmH2O:9.80665,inH2O:249.08891};
export function parsePoints(text,label='曲線'){
 const rows=text.trim().split(/\r?\n/).filter(s=>s.trim());
 if(rows.length>2000)throw Error(`${label}最多 2,000 點。`);
 let pts=[];
 for(let i=0;i<rows.length;i++){
  const line=rows[i].trim().replace(/−/g,'-');
  const cols=line.split(/[,，;；\t]/.test(line)?/[,，;；\t]/:/\s+/).map(v=>v.trim().replace(/^"|"$/g,''));
  const nums=cols.map(v=>Number(v));
  if(i===0&&cols.length===2&&nums.some(n=>!Number.isFinite(n))&&cols.every(v=>/[A-Za-z\u3400-\u9fff]/.test(v)))continue;
  if(cols.length!==2||cols.some(v=>!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(v))||nums.some(n=>!Number.isFinite(n)||n<0))throw Error(`${label}第 ${i+1} 列需為兩個非負數：流量、壓差。`);
  pts.push({q:nums[0],p:nums[1]});
 }
 if(pts.length<2)throw Error(`${label}至少需要兩個資料點。`);
 pts.sort((a,b)=>a.q-b.q);
 if(pts.some((a,i)=>i&&a.q===pts[i-1].q))throw Error(`${label}有重複流量，請保留一個壓差值。`);
 if(pts.at(-1).q<=0)throw Error(`${label}需要大於零的流量。`);
 return pts;
}
export function interpolate(pts,q){
 const tol=1e-10*Math.max(1,pts.at(-1).q);
 if(q<pts[0].q-tol||q>pts.at(-1).q+tol)return null;
 if(q<=pts[0].q)return pts[0].p;
 for(let i=1;i<pts.length;i++)if(q<=pts[i].q){let a=pts[i-1],b=pts[i];return a.p+(b.p-a.p)*(q-a.q)/(b.q-a.q);}
 return pts.at(-1).p;
}
export function quadraticFit(pts){
 let numerator=0,denominator=0;
 for(const {q,p} of pts){numerator+=q*q*p;denominator+=q**4;}
 const k=numerator/denominator;
 return {k,rmse:Math.sqrt(pts.reduce((s,{q,p})=>s+(k*q*q-p)**2,0)/pts.length)};
}
// Every interval contains a linear fan curve and linear/quadratic resistance.
// Split at all knots and solve quadratics, including tangencies and coincident segments.
export function intersections(fan,system,knots){
 const low=Math.max(fan[0].q,knots[0]),high=Math.min(fan.at(-1).q,knots.at(-1));
 if(low>high)return [];
 const xs=[low,high,...fan.map(v=>v.q),...knots].filter(q=>q>=low&&q<=high).sort((a,b)=>a-b).filter((q,i,a)=>!i||q!==a[i-1]);
 const out=[];const delta=q=>interpolate(fan,q)-system(q);
 function add(q,coincident=false){if(out.some(v=>Math.abs(v.q-q)<1e-8*Math.max(1,high)))return;const h=Math.max(high*1e-6,1e-9),l=Math.max(low,q-h),r=Math.min(high,q+h);const slope=r>l?(delta(r)-delta(l))/(r-l):0;out.push({q,p:system(q),slope,stable:slope< -1e-6,coincident});}
 if(xs.length===1&&Math.abs(delta(xs[0]))<1e-7)add(xs[0]);
 for(let i=1;i<xs.length;i++){
  const l=xs[i-1],r=xs[i],m=(l+r)/2,d0=delta(l),dm=delta(m),d1=delta(r);
  const a=2*(d1+d0-2*dm),b=d1-d0-a,c=d0;
  if(Math.abs(a)<1e-9){if(Math.abs(b)<1e-9){if(Math.abs(c)<1e-7){add(l,true);add(r,true);}}else{const t=-c/b;if(t>=-1e-9&&t<=1+1e-9)add(l+Math.max(0,Math.min(1,t))*(r-l));}}
  else{const disc=b*b-4*a*c;if(disc>=-1e-9){const s=Math.sqrt(Math.max(0,disc));for(const t of [(-b-s)/(2*a),(-b+s)/(2*a)])if(t>=-1e-9&&t<=1+1e-9)add(l+Math.max(0,Math.min(1,t))*(r-l));}}
 }
 return out.sort((a,b)=>a.q-b.q);
}
export function calculate(s){
 const number=(key,min,max)=>{const str=String(s[key]??'').trim(),n=Number(str);if(!str||!Number.isFinite(n)||n<min||n>max)throw Error(`「${({count:'風扇數量',speed:'轉速比例',dirty:'壓降倍率',width:'迎風寬度',height:'迎風高度',reference:'其他阻抗參考流量',extra:'其他壓降'})[key]}」需介於 ${min} 與 ${max}。`);return n;};
 if(!FLOW[s.displayFlow]||!PRESSURE[s.displayPressure]||!FLOW[s.fanFlow]||!PRESSURE[s.fanPressure]||(!FLOW[s.filterFlow]&&s.filterFlow!=='m/s')||!PRESSURE[s.filterPressure])throw Error('請選擇有效單位。');
 const n=number('count',1,8);if(!Number.isInteger(n))throw Error('風扇數量需為整數。');
 const speed=number('speed',10,150)/100,dirty=number('dirty',1,10),width=number('width',0.01,10000),height=number('height',0.01,10000),area=width*height/1e6;
 const reference=number('reference',0.001,1e6)*FLOW[s.displayFlow],extra=number('extra',0,1e6)*PRESSURE[s.displayPressure];
 const rawFan=parsePoints(s.fanText,'風扇 PQ'),rawFilter=parsePoints(s.filterText,'阻抗曲線');
 const fan=rawFan.map(({q,p})=>({q:q*FLOW[s.fanFlow]*speed*(s.arrangement==='parallel'?n:1),p:p*PRESSURE[s.fanPressure]*speed**2*(s.arrangement==='series'?n:1)}));
 const filter=rawFilter.map(({q,p})=>({q:q*(s.filterFlow==='m/s'?area:FLOW[s.filterFlow]),p:p*PRESSURE[s.filterPressure]}));
 const fit=quadraticFit(filter),filterAt=q=>s.method==='quadratic'?fit.k*q*q:interpolate(filter,q);
 const maxQ=s.method==='quadratic'?fan.at(-1).q:Math.min(fan.at(-1).q,filter.at(-1).q),minQ=s.method==='quadratic'?fan[0].q:Math.max(fan[0].q,filter[0].q);
 const system=(q,multiplier=1)=>{const p=filterAt(q);return p===null?null:p*multiplier+extra*(q/reference)**2;};
 const knots=s.method==='quadratic'?[fan[0].q,fan.at(-1).q]:filter.map(v=>v.q);
 const roots=intersections(fan,q=>system(q),knots),dirtyRoots=intersections(fan,q=>system(q,dirty),knots);
 const warnings=[];
 if(fan.some((p,i)=>i&&p.p>fan[i-1].p))warnings.push('風扇曲線含壓力隨流量上升的區段；保留原曲線，可能有多個交點。不能僅靠 PQ 曲線確定失速範圍。');
 if(filter.some((p,i)=>i&&p.p<filter[i-1].p))warnings.push('阻抗資料有壓降隨流量下降的區段，請確認量測與資料順序。');
 if(filter[0].q===0&&filter[0].p>0)warnings.push('阻抗在零流量時仍有壓差，請確認是否包含量測偏移或固定背壓。');
 if(s.method==='quadratic')warnings.push('平方擬合假設 Δp = KQ²，會延伸到風扇資料範圍；濾材未必符合平方律，請比較擬合誤差。');
 if(!roots.length)warnings.push('共同資料範圍內沒有交點；請補充曲線資料。插值模式不會外推。');
 if(roots.length>1)warnings.push('存在多個交點，不自動選定工作點；需搭配實際運轉與廠商資料判斷。');
 if(roots.some(r=>r.coincident))warnings.push('部分曲線重合，該區間無法辨識唯一工作點。');
 if(n>1)warnings.push('多風扇以相同風扇的理想串／並聯合成，未計入互擾、回流或安裝損失。');
 if(speed!==1)warnings.push('轉速依相似律縮放：Q ∝ N、Δp ∝ N²；假設風扇幾何與空氣密度不變。');
 return {fan,filter,fit,filterAt,system,roots,dirtyRoots,warnings,minQ,maxQ,area,dirty};
}

// FloTHERM Advanced: f = A/Re + B/Re^Index, Index = 0.
// Fit total measured pressure drop against approach velocity; no constant term.
export function advancedResistance(s){
 const positive=(key,label)=>{const raw=String(s[key]??'').trim(),v=Number(raw);if(!raw||!Number.isFinite(v)||v<=0)throw Error(`${label}需為大於零的有限數。`);return v;};
 const area=positive('width','迎風寬度')*positive('height','迎風高度')/1e6;
 const rho=positive('density','空氣密度'),mu=positive('viscosity','動力黏度'),L=positive('lengthScale','Length Scale');
 if(!['planar','volume'].includes(s.resistanceType))throw Error('請選擇平面或體積阻抗。');
 const d=s.resistanceType==='volume'?positive('depth','流向厚度')/1000:1;
 if((!FLOW[s.filterFlow]&&s.filterFlow!=='m/s')||!PRESSURE[s.filterPressure])throw Error('請選擇有效濾網單位。');
 const points=parsePoints(s.filterText,'Advanced 濾網資料').map(({q,p})=>({v:s.filterFlow==='m/s'?q:q*FLOW[s.filterFlow]/area,p:p*PRESSURE[s.filterPressure]}));
 if(points.filter(p=>p.v>0).length<2)throw Error('需至少兩個不同的正風速資料點，才能辨識線性與平方兩項。');
 const scale=points.at(-1).v;
 let s2=0,s3=0,s4=0,t1=0,t2=0;
 for(const {v,p} of points){const x=v/scale;s2+=x*x;s3+=x**3;s4+=x**4;t1+=x*p;t2+=x*x*p;}
 const det=s2*s4-s3*s3;
 if(!(det>1e-12*s2*s4))throw Error('正風速資料過於接近，無法可靠區分兩項；請擴大量測風速範圍。');
 const u=(t1*s4-t2*s3)/det,w=(s2*t2-s3*t1)/det;
 const candidates=[{u:Math.max(0,t1/s2),w:0},{u:0,w:Math.max(0,t2/s4)}];
 if(u>=0&&w>=0)candidates.push({u,w});
 for(const c of candidates)c.sse=points.reduce((sum,{v,p})=>sum+(c.u*v/scale+c.w*(v/scale)**2-p)**2,0);
 const best=candidates.sort((a,b)=>a.sse-b.sse)[0],c1=best.u/scale,c2=best.w/scale**2;
 const A=2*L*c1/(mu*d),B=2*c2/(rho*d);
 if(![area,c1,c2,A,B].every(Number.isFinite))throw Error('數值超出可計算範圍，請確認尺寸與物性。');
 const rows=points.map(p=>({...p,predicted:c1*p.v+c2*p.v**2}));
 return {A,B,index:0,L,d,rho,mu,area,c1,c2,rows,rmse:Math.sqrt(best.sse/points.length),maxError:Math.max(...rows.map(p=>Math.abs(p.predicted-p.p))),constrained:u<0||w<0,minV:points[0].v,maxV:scale,type:s.resistanceType};
}
