// SI units internally. No external data or network requests.
export function air(T) {
  const rho=101325/(287.058*T), mu=1.716e-5*(T/273.15)**1.5*(273.15+111)/(T+111);
  const k=.0241*(T/273.15)**.9, cp=1006;
  return {rho,mu,k,nu:mu/rho,alpha:k/(rho*cp),Pr:mu*cp/k,beta:1/T};
}
export function enclosureFaces(p,Ts) {
  const {L,W,H,Ta,Tr,eps,bottom,mode,h}=p, dt=Ts-Ta, a=air((Ts+Ta)/2+273.15);
  const defs=[['前／後面',2*L*H,H,'vertical',2],['左／右面',2*W*H,H,'vertical',2],['頂面',L*W,L*W/(2*(L+W)),'up',1],['底面',bottom?L*W:0,L*W/(2*(L+W)),'down',1]];
  return defs.map(([name,A,len,kind,count])=>{
    const Ra=9.81*a.beta*Math.abs(dt)*len**3/(a.nu*a.alpha);
    const buoyant=(kind==='up'&&dt>=0)||(kind==='down'&&dt<0);
    let Nu,valid=true,range='';
    if(kind==='vertical') {Nu=Ra<=1e9?.68+.67*Ra**.25/(1+(.492/a.Pr)**(9/16))**(4/9):(.825+.387*Ra**(1/6)/(1+(.492/a.Pr)**(9/16))**(8/27))**2;range='10⁴ ≤ Ra ≤ 10¹³';valid=Ra>=1e4&&Ra<=1e13;}
    else if(buoyant) {Nu=Ra<1e7?.54*Ra**.25:.15*Ra**(1/3);range='10⁴ ≤ Ra ≤ 10¹¹';valid=Ra>=1e4&&Ra<=1e11;}
    else {Nu=.27*Ra**.25;range='10⁵ ≤ Ra ≤ 10¹⁰';valid=Ra>=1e5&&Ra<=1e10;}
    const hc=mode==='manual'?h:Nu*a.k/len;
    return {name,A,len,kind,count,Ra,h:hc,qc:hc*A*dt,qr:eps*5.670374419e-8*A*((Ts+273.15)**4-(Tr+273.15)**4),valid:mode==='manual'||valid||Math.abs(dt)<1e-8,range};
  });
}
export function enclosurePower(p,Ts) {return enclosureFaces(p,Ts).reduce((s,f)=>s+f.qc+f.qr,0);}
export function solveEnclosure(p) {
  let lo=Math.min(p.Ta,p.Tr),hi=500;
  if(enclosurePower(p,hi)<p.Q)throw Error('所需外殼溫度超過 500°C，已超出此初估模型範圍。');
  for(let i=0;i<85;i++){const mid=(lo+hi)/2;if(enclosurePower(p,mid)<p.Q)lo=mid;else hi=mid;}
  const Ts=(lo+hi)/2,faces=enclosureFaces(p,Ts), qc=faces.reduce((s,f)=>s+f.qc,0),qr=faces.reduce((s,f)=>s+f.qr,0);
  const film=(Ts+p.Ta)/2+273.15;
  return {Ts,faces,qc,qr,A:faces.reduce((s,f)=>s+f.A,0),capacity:enclosurePower(p,p.limit),filmValid:film>=250&&film<=500,residual:qc+qr-p.Q};
}
export function solveChain(p) {
  const layers=p.layers.map(l=>({...l,R:l.t/1000/(l.k*l.w*l.h/1e6)}));
  const stages=[{name:'封裝 Junction → Case',R:p.Rjc},...layers,{name:'接觸熱阻（總和）',R:p.contact},{name:'擴散／其他熱阻',R:p.spread}];
  const R=stages.reduce((s,l)=>s+l.R,0);
  if(!(R>0))throw Error('冷板路徑總熱阻必須大於 0。');
  const parallel=p.parallel;
  const Tj=parallel?(p.P+p.Tplate/R+p.Ta/p.Rother)/(1/R+1/p.Rother):p.Tplate+p.P*R;
  const Qcold=(Tj-p.Tplate)/R,Qother=parallel?(Tj-p.Ta)/p.Rother:0;
  let T=Tj;
  const nodes=stages.map(s=>{const high=T,drop=Qcold*s.R;T-=drop;return {...s,high,low:T,drop};});
  const maxPlate=p.max-(p.P-(parallel?(p.max-p.Ta)/p.Rother:0))*R;
  return {R,Tj,Qcold,Qother,nodes,maxPlate,margin:p.max-Tj,caseT:nodes[0].low,residual:Qcold+Qother-p.P};
}
