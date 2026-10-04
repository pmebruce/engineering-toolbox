import {FLOW,PRESSURE,calculate,interpolate,advancedResistance} from './calc.mjs?v=1.2';
const $=id=>document.getElementById(id),ids=['fanName','filterName','fanText','filterText','fanFlow','fanPressure','filterFlow','filterPressure','width','height','count','arrangement','speed','method','reference','extra','dirty','displayFlow','displayPressure','samples','resistanceType','density','viscosity','lengthScale','depth'];
const units={CFM:'CFM','m3/h':'m³/h','L/s':'L/s','m3/s':'m³/s',Pa:'Pa',kPa:'kPa',mmH2O:'mmH₂O',inH2O:'inH₂O'};
const example={fanName:'示範 120 mm 風扇',filterName:'示範濾網',fanText:'0, 95\n20, 88\n40, 72\n60, 50\n80, 27\n99, 0',filterText:'0, 0\n40, 7\n80, 23\n120, 46\n160, 77\n200, 115',fanFlow:'CFM',fanPressure:'Pa',filterFlow:'CFM',filterPressure:'Pa',width:'263',height:'120',count:'2',arrangement:'parallel',speed:'100',method:'interpolation',reference:'100',extra:'0',dirty:'1.5',displayFlow:'CFM',displayPressure:'Pa',samples:'21',resistanceType:'planar',density:'1.2',viscosity:'0.0000181',lengthScale:'1',depth:'10'};
let isDemo=true,result=null,state=null,chartSvg='',toastTimer,advancedResult=null;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
function read(){return Object.fromEntries(ids.map(id=>[id,$(id).value]));}
function apply(s){for(const id of ids)if(s[id]!==undefined)$(id).value=String(s[id]);}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function save(){try{localStorage.setItem('fan-filter-v1',JSON.stringify({...read(),isDemo}));$('save-status').textContent='已保存於本機 · 不上傳';}catch{$('save-status').textContent='本機儲存不可用 · 請匯出留存';}}
function rootMarkup(roots){if(!roots.length)return '<p class="op-detail">有效資料範圍內沒有交點</p>';return roots.map((r,i)=>`<div class="op-detail">${roots.length>1?`交點 ${i+1} · `:''}<div class="metric"><b>${fmt(r.q/FLOW[state.displayFlow],state.displayFlow==='m3/s'?4:2)}</b><span>${units[state.displayFlow]}</span></div><div>系統壓差 ${fmt(r.p/PRESSURE[state.displayPressure],state.displayPressure==='Pa'?2:3)} ${units[state.displayPressure]}</div><small>${r.coincident?'曲線重合 · 工作點不唯一':r.stable?'局部斜率：恢復方向（僅初步判讀）':'局部斜率：需進一步確認'}</small></div>`).join('');}
function update(){
 state=read();updateAdvanced();$('demo-status').hidden=!isDemo;$('reference-unit').textContent=units[state.displayFlow];$('extra-unit').textContent=units[state.displayPressure];
 try{
  result=calculate(state);$('error').hidden=true;$('operating').innerHTML=rootMarkup(result.roots);
  const unique=result.roots.length===1&&result.dirtyRoots.length===1&&!result.roots[0].coincident&&!result.dirtyRoots[0].coincident;
  $('dirty-result').innerHTML=`<div class="dirty-summary">濾網壓降 × ${escape(state.dirty)}：${result.dirtyRoots.length?result.dirtyRoots.map(r=>`${fmt(r.q/FLOW[state.displayFlow],state.displayFlow==='m3/s'?4:2)} ${units[state.displayFlow]} / ${fmt(r.p/PRESSURE[state.displayPressure],3)} ${units[state.displayPressure]}`).join('；'):'有效範圍內無交點'}${unique&&result.roots[0].q>0?`<br>流量變化 ${fmt((result.dirtyRoots[0].q/result.roots[0].q-1)*100,1)}%`:''}</div>`;
  $('area-info').textContent=`有效迎風面積 ${fmt(result.area,6)} m²。${unique?`原工作點面風速 ${fmt(result.roots[0].q/result.area,2)} m/s。`:''}`;
  $('point-count').textContent=`風扇 ${result.fan.length} 點 · 阻抗 ${result.filter.length} 點`;
  $('warnings').innerHTML=(result.warnings.length?result.warnings:['共同範圍內曲線可計算。請確認輸入資料與實際配置一致。']).map(w=>`<li>${escape(w)}</li>`).join('');
  $('fit-info').textContent=state.method==='quadratic'?`平方擬合 K = ${result.fit.k.toExponential(5)} Pa/(m³/s)²；RMSE = ${fmt(result.fit.rmse,3)} Pa。壓降倍率 ${state.dirty} 僅作用於濾網。`:'使用輸入阻抗的分段線性插值；不增加原點、不外推。壓降倍率僅作用於濾網，其他阻抗保持原設定。';
  drawChart();preview();
  for(const id of ['fan-export','system-export','all-export','svg-export','fan-copy','system-copy'])$(id).disabled=['system-export','system-copy'].includes(id)?result.maxQ<=result.minQ:false;
 }catch(e){
  result=null;$('error').hidden=false;$('error').textContent=e.message;$('operating').innerHTML='<p class="op-detail">請修正輸入後再計算</p>';$('dirty-result').textContent='';$('chart').innerHTML='<p class="note">等待有效曲線資料</p>';$('warnings').innerHTML='';$('fit-info').textContent='';$('point-count').textContent='';$('area-info').textContent='';$('preview-head').textContent='';$('preview-body').textContent='';
  for(const id of ['fan-export','system-export','all-export','svg-export','fan-copy','system-copy'])$(id).disabled=true;
 }
}
function chartLine(points,x,y,color,dash=''){return `<path d="${points.map((p,i)=>`${i?'L':'M'}${x(p.q).toFixed(2)},${y(p.p).toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" ${dash?`stroke-dasharray="${dash}"`:''}/>`;}
function sample(fn,lo,hi,n=81){if(hi<lo)return [];return Array.from({length:n},(_,i)=>{const q=lo+(hi-lo)*i/(n-1);return {q,p:fn(q)};}).filter(p=>p.p!==null&&Number.isFinite(p.p));}
function drawChart(){
 const {fan,filter,system,filterAt,minQ,maxQ,dirty}=result;
 const qmax=Math.max(fan.at(-1).q,filter.at(-1).q)*1.04;
 const filterLine=state.method==='quadratic'?sample(filterAt,fan[0].q,fan.at(-1).q):filter;
 const systemLine=sample(q=>system(q),minQ,maxQ),dirtyLine=sample(q=>system(q,dirty),minQ,maxQ);
 const all=[...fan,...filterLine,...systemLine,...dirtyLine];const pmax=Math.max(1,...all.map(p=>p.p))*1.12;
 const W=620,H=350,L=70,R=24,T=38,B=60,x=q=>L+q/qmax*(W-L-R),y=p=>H-B-p/pmax*(H-T-B);
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="風扇與阻抗比較圖"><rect width="${W}" height="${H}" fill="white"/><g font-family="Arial, sans-serif" font-size="13" fill="#385665"><text x="${L}" y="19">靜壓 / 壓降 (${units[state.displayPressure]})</text>`;
 for(let i=0;i<=5;i++){const q=qmax*i/5,p=pmax*i/5;svg+=`<path d="M${x(q)},${T}V${H-B} M${L},${y(p)}H${W-R}" stroke="#e3ecf1" fill="none"/><text x="${x(q)}" y="${H-B+22}" text-anchor="middle">${fmt(q/FLOW[state.displayFlow],state.displayFlow==='m3/s'?3:1)}</text><text x="${L-10}" y="${y(p)+4}" text-anchor="end">${fmt(p/PRESSURE[state.displayPressure],state.displayPressure==='Pa'?0:2)}</text>`;}
 svg+=`<text x="${(L+W-R)/2}" y="${H-10}" text-anchor="middle">體積流量 (${units[state.displayFlow]})</text></g>`;
 svg+=chartLine(filterLine,x,y,'#078879')+chartLine(systemLine,x,y,'#9c5c14','7 4')+chartLine(dirtyLine,x,y,'#a04879','3 5')+chartLine(fan,x,y,'#1767b1');
 for(const p of fan)svg+=`<circle cx="${x(p.q)}" cy="${y(p.p)}" r="3" fill="#1767b1"/>`;
 for(const p of filter)svg+=`<circle cx="${x(p.q)}" cy="${y(p.p)}" r="3" fill="#078879"/>`;
 for(const p of result.roots)svg+=`<circle cx="${x(p.q)}" cy="${y(p.p)}" r="6" fill="#fff" stroke="#173f55" stroke-width="3"><title>${fmt(p.q/FLOW[state.displayFlow],4)} ${units[state.displayFlow]}, ${fmt(p.p/PRESSURE[state.displayPressure],3)} ${units[state.displayPressure]}</title></circle>`;
 svg+='</svg>';chartSvg=svg;$('chart').innerHTML=svg;
}
function tableRows(kind){
 const n=Number(state.samples),qf=FLOW[state.displayFlow],pf=PRESSURE[state.displayPressure];
 const start=kind==='fan'?result.fan[0].q:kind==='system'?result.minQ:Math.min(result.fan[0].q,result.filter[0].q);
 const end=kind==='fan'?result.fan.at(-1).q:kind==='system'?result.maxQ:Math.max(result.fan.at(-1).q,result.filter.at(-1).q);
 const decimal=v=>v===null||!Number.isFinite(v)?'':Number(v.toPrecision(9));
 return Array.from({length:n},(_,i)=>{const q=start+(end-start)*i/(n-1),f=interpolate(result.fan,q),within=q>=result.minQ-1e-10&&q<=result.maxQ+1e-10;
  if(kind==='fan')return [decimal(q/qf),decimal(f/pf)];
  if(kind==='system')return [decimal(q/qf),decimal(result.system(q)/pf)];
  const filterIn=state.method==='quadratic'?q>=result.fan[0].q&&q<=result.fan.at(-1).q:q>=result.filter[0].q&&q<=result.filter.at(-1).q;
  const filterP=filterIn?result.filterAt(q):null;
  return [decimal(q/qf),f===null?'':decimal(f/pf),filterP===null?'':decimal(filterP/pf),within?decimal(result.system(q)/pf):'',within?decimal(result.system(q,result.dirty)/pf):''];
 });
}
function headers(kind){const flow=`流量 (${units[state.displayFlow]})`,p=units[state.displayPressure];return kind==='fan'?[flow,`風扇靜壓 (${p})`]:kind==='system'?[flow,`總系統壓降 (${p})`]:[flow,`風扇 (${p})`,`濾網 (${p})`,`總系統 (${p})`,`倍率情境 (${p})`];}
function preview(){const hs=headers('all');$('preview-head').innerHTML='<tr>'+hs.map(h=>`<th>${escape(h)}</th>`).join('')+'</tr>';$('preview-body').innerHTML=tableRows('all').map(r=>'<tr>'+r.map(v=>`<td>${v===''?'—':escape(v)}</td>`).join('')+'</tr>').join('');}
function download(text,type,name){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function csv(kind){if(!result)return;const rows=[headers(kind),...tableRows(kind)];const contents=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');download('\uFEFF'+contents,'text/csv;charset=utf-8',`fan-filter-${kind}.csv`);toast('已產生曲線 CSV');}
for(const id of ids)$(id).addEventListener('input',()=>{
 if(id==='displayFlow'&&state){const q=Number($('reference').value);if(Number.isFinite(q))$('reference').value=Number((q*FLOW[state.displayFlow]/FLOW[$('displayFlow').value]).toPrecision(10));}
 if(id==='displayPressure'&&state){const p=Number($('extra').value);if(Number.isFinite(p))$('extra').value=Number((p*PRESSURE[state.displayPressure]/PRESSURE[$('displayPressure').value]).toPrecision(10));}
 if(!['displayFlow','displayPressure','samples','resistanceType','density','viscosity','lengthScale','depth'].includes(id))isDemo=false;
 update();save();
});
$('example').addEventListener('click',()=>{if(!isDemo&&!confirm('載入示範會取代目前輸入，是否繼續？'))return;apply(example);isDemo=true;update();save();});
$('clear').addEventListener('click',()=>{if(!confirm('清空目前兩條曲線？其他設定會保留。'))return;$('fanText').value='';$('filterText').value='';isDemo=false;update();save();});
for(const kind of ['fan','filter'])$(kind+'-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>150000)throw Error('檔案過大，請限制在 150 KB 以內。');$(kind+'Text').value=(await file.text()).replace(/^\uFEFF/,'');isDemo=false;update();save();}catch(e){toast(e.message);}event.target.value='';});
async function copyTable(kind){if(!result)return;const text=tableRows(kind).map(r=>r.join('\t')).join('\n');try{await navigator.clipboard.writeText(text);toast('已複製 '+(kind==='fan'?'風扇':'系統阻抗')+'兩欄，單位：'+units[state.displayFlow]+' / '+units[state.displayPressure]);}catch{$('copy-buffer').hidden=false;$('copy-buffer').value=text;$('copy-buffer').focus();$('copy-buffer').select();toast('請在下方資料框手動複製');}}
$('fan-copy').addEventListener('click',()=>copyTable('fan'));$('system-copy').addEventListener('click',()=>copyTable('system'));
$('fan-export').addEventListener('click',()=>csv('fan'));$('system-export').addEventListener('click',()=>csv('system'));$('all-export').addEventListener('click',()=>csv('all'));
$('svg-export').addEventListener('click',()=>{if(!result)return;const name=`${state.fanName} × ${state.filterName}${isDemo?' · 示範資料':''}`;const exported=chartSvg.replace('height="350"','height="410"').replace('viewBox="0 0 620 350"','viewBox="0 0 620 410"').replace('</svg>',`<text x="70" y="374" font-family="sans-serif" font-size="13" fill="#385665">${escape(name)}</text><text x="70" y="398" font-family="sans-serif" font-size="12" fill="#385665">藍：風扇　綠：濾網　棕：系統　紫：倍率情境 × ${escape(state.dirty)}</text></svg>`);download(exported,'image/svg+xml','fan-filter-curves.svg');});
function updateAdvanced(){
 $('depth-field').hidden=state.resistanceType!=='volume';
 try{
  advancedResult=advancedResistance(state);const r=advancedResult;
  $('advanced-error').hidden=true;$('advanced-output').hidden=false;
  $('advanced-a').textContent=r.A.toExponential(6);$('advanced-b').textContent=r.B.toExponential(6);
  $('advanced-settings').textContent=`${r.type==='planar'?'Planar / Collapsed · A、B 無因次':'Volume / Non-Collapsed · A、B 單位 1/m'}；Length Scale = ${r.L} m；Index = 0。Based On：Approach Velocity。`;
  $('advanced-fit').textContent=`Δp = ${fmt(r.c1,5)} v + ${fmt(r.c2,5)} v² (Pa)；RMSE ${fmt(r.rmse,3)} Pa；最大絕對誤差 ${fmt(r.maxError,3)} Pa。資料範圍 ${fmt(r.minV,3)}–${fmt(r.maxV,3)} m/s。`;
  $('advanced-warning').textContent=r.constrained?'自由擬合會出現負係數，已改用非負限制的最佳擬合；請檢查曲線形狀與量測偏移。':r.rows[0].v===0&&r.rows[0].p>0?'零風速仍有壓差；此擬合不保留固定偏壓，請檢查量測零點。':'A、B 由目前濾網原始資料換算；工作點仍依「資料處理」選擇計算，未自動改用此擬合。';
  $('advanced-preview').innerHTML=r.rows.map(p=>`<tr><td>${fmt(p.v,4)}</td><td>${fmt(p.p,3)}</td><td>${fmt(p.predicted,3)}</td><td>${fmt(p.predicted-p.p,3)}</td></tr>`).join('');
 }catch(e){advancedResult=null;$('advanced-output').hidden=true;$('advanced-error').hidden=false;$('advanced-error').textContent=e.message;}
}
function advancedText(){const r=advancedResult;return [
 'FloTHERM Advanced Resistance — '+state.filterName+(isDemo?' (synthetic demo data)':''),
 'Source: input filter/resistance curve only; excludes extra resistance and dirty multiplier.',
 'Resistance Type: '+(r.type==='planar'?'Planar / Collapsed':'Volume / Non-Collapsed'),
 'Loss Coefficients Based On: Approach Velocity','Resistance Formula: Advanced',
 'A Coefficient: '+r.A.toPrecision(10),'B Coefficient: '+r.B.toPrecision(10),
 'Coefficient units: '+(r.type==='planar'?'dimensionless':'1/m'),
 'Index: 0','Length Scale: '+r.L+' m',...(r.type==='volume'?['Flow-direction thickness: '+r.d+' m']:[]),
 'Density: '+r.rho+' kg/m3','Dynamic viscosity: '+r.mu+' Pa.s','Frontal area: '+r.area+' m2',
 'Fit: deltaP(Pa) = '+r.c1.toPrecision(10)+' * v(m/s) + '+r.c2.toPrecision(10)+' * v(m/s)^2',
 'Measured velocity range: '+r.minV+' to '+r.maxV+' m/s','Fit RMSE: '+r.rmse+' Pa',
 'Check software model type, direction, velocity basis and thickness before use.'
 ].join('\n');}
$('advanced-copy').addEventListener('click',async()=>{if(!advancedResult)return;const text=advancedText();try{await navigator.clipboard.writeText(text);toast('已複製 A、B、Index 與完整設定');}catch{$('copy-buffer').hidden=false;$('copy-buffer').value=text;$('copy-buffer').focus();$('copy-buffer').select();toast('請在資料框手動複製設定');}});
$('advanced-export').addEventListener('click',()=>{if(advancedResult){download(advancedText(),'text/plain;charset=utf-8','flotherm-advanced-resistance.txt');toast('已產生 Advanced 設定 TXT');}});

apply(example);try{const saved=JSON.parse(localStorage.getItem('fan-filter-v1'));if(saved&&typeof saved==='object'){apply(saved);isDemo=saved.isDemo===true;}}catch{}update();
let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else toast('iPhone：用 Safari 分享選單，選擇「加入主畫面」。');});
if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){$('install').textContent='已安裝';$('install').disabled=true;}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
