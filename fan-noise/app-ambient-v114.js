import {evaluateScenario,combine,parseLevels,distanceLevel,estimateSpeed,estimateThermalWindow,createFlowRelation,localAirTemperature,calculateDeratingMap,calculateAmbientDeratingMap} from './calc-ambient-v114.mjs';
const $=id=>document.getElementById(id),keys=['basis','flowTarget','limit','distance','distanceMode'];
const sources={vendor:'廠商資料',measured:'實測',estimate:'推估'};
const demo=[{name:'單顆高速 · 示範',count:'1',level:'32',distance:'1',flow:'110',rpm:'2200',source:'estimate'},{name:'雙顆低速 · 示範',count:'2',level:'25',distance:'1',flow:'55',rpm:'1400',source:'estimate'},{name:'四顆低速 · 示範',count:'4',level:'22',distance:'1',flow:'28',rpm:'1000',source:'estimate'}];
let rows=structuredClone(demo),isDemo=true,last=[],timer;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>n===null?'未填':Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
function options(){return Object.fromEntries(keys.map(k=>[k,$(k).value]));}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,3500);}
function save(){try{localStorage.setItem('fan-noise-v1',JSON.stringify({rows,isDemo,options:options()}));$('save-status').textContent='已保存於本機 · 不上傳資料';}catch{$('save-status').textContent='本機儲存不可用，請匯出結果';}}
function field(i,key,label,type='number'){return `<label>${label}<input data-key="${key}" ${type==='number'?'type="number" step="any"':'type="text" maxlength="80"'} value="${esc(rows[i][key]??'')}" /></label>`;}
function renderRows(){const o=options();$('scenarios').innerHTML=rows.map((r,i)=>`<article class="scenario" data-index="${i}"><div class="section-title"><h3>方案 ${i+1}</h3><button class="text-button remove" ${rows.length===1?'disabled':''}>刪除此方案</button></div>${field(i,'name','方案名稱','text')}<div class="two">${field(i,'count','相同風扇數量')}${field(i,'level',o.basis==='LpA'?'單顆 LpA (dBA)':'單顆 LwA (dB re 1 pW)')}${o.basis==='LpA'?field(i,'distance','原量測距離 (m)'):''}${field(i,'flow','單顆工作點風量 (CFM) · 可留空')}${field(i,'rpm','轉速 RPM · 僅紀錄，可留空')}<label>噪音資料來源<select data-key="source">${Object.entries(sources).map(([v,t])=>`<option value="${v}" ${r.source===v?'selected':''}>${t}</option>`).join('')}</select></label></div><button class="secondary import">帶入阻抗工具工作點</button><p class="import-note">${esc(r.flowNote||'尚未帶入 PQ；可直接輸入工作點風量。')}</p></article>`).join('');}
function update(){const o=options(),lp=o.basis==='LpA';for(const id of ['limit-field','distance-field','mode-field'])$(id).hidden=!lp;$('demo-label').hidden=!isDemo;
 $('basis-note').textContent=lp?(o.distanceMode==='same'?'僅比較相同距離的聲壓資料。預設上限 30 dBA，可依需求修改。':'自由場遠場估算：距離加倍約降低 6 dB。室內反射、箱內與近場不適用；請自行確認量測與評估條件。'):'聲功率與距離無關；只比較合成 LwA，不判定是否符合聲壓上限。請勿把廠商 LpA 數值填到 LwA 欄位。';
 last=rows.map(r=>{try{return {r,value:evaluateScenario(r,o)};}catch(e){return {r,error:e.message};}});
 $('results').innerHTML='<div class="results-grid">'+last.map(({r,value:v,error})=>`<article class="result"><h3>${esc(r.name||'未命名方案')}</h3><span class="tag">${isDemo?'示範數據':esc(sources[r.source]||'未指定來源')}</span>${error?`<p class="fail">${esc(error)}</p>`:`<p>合成 ${lp?'LpA':'LwA'}</p><strong>${fmt(v.total)} <small>${lp?'dBA @ '+esc(o.distance)+' m':'dB re 1 pW'}</small></strong><p class="${v.noisePass===null?'':v.noisePass?'pass':'fail'}">${v.margin===null?'聲功率比較 · 不判定聲壓合格':v.margin>=0?'低於上限 '+fmt(v.margin)+' dB':'超過上限 '+fmt(-v.margin)+' dB'}</p><p>總風量 ${v.totalFlow===null?'未提供':fmt(v.totalFlow)+' CFM'}<br><span class="${v.flowPass===null?'':v.flowPass?'pass':'fail'}">${v.flowPass===null?'風量達標狀態未知':v.flowPass?'風量達標':'風量不足'}</span></p>`}</article>`).join('')+'</div>';
 draw();const valid=last.some(x=>x.value);$('csv').disabled=!valid;$('copy').disabled=!valid;
}
function draw(){const items=last.filter(x=>x.value);if(!items.length){$('noise-chart').innerHTML='';return;}const o=options(),max=Math.max(40,...items.map(x=>x.value.total),o.basis==='LpA'?Number(o.limit):0)*1.1,W=620,H=50+items.length*64;let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="合成噪音比較圖"><rect width="620" height="${H}" fill="white"/>`;
 items.forEach(({r,value:v},i)=>{let y=20+i*64,w=Math.max(0,v.total)/max*370;svg+=`<text x="10" y="${y+17}" font-size="13" fill="#173444">${esc((r.name||'方案').slice(0,13))}</text><rect x="180" y="${y}" width="${w}" height="26" rx="5" fill="${v.noisePass===false?'#b77759':'#28899b'}"/><text x="${190+w}" y="${y+18}" font-size="14" fill="#173444">${fmt(v.total)}</text>`;});
 if(o.basis==='LpA'&&Number.isFinite(Number(o.limit))){let x=180+Number(o.limit)/max*370;svg+=`<path d="M${x},10V${H-35}" stroke="#b6543f" stroke-dasharray="5 4"/><text x="${x}" y="${H-12}" font-size="12" text-anchor="middle" fill="#8c402b">上限 ${esc(o.limit)} dBA</text>`;}else svg+=`<text x="180" y="${H-12}" font-size="12" fill="#506b79">合成 LwA · dB re 1 pW</text>`;
 $('noise-chart').innerHTML=svg+'</svg>';
}
function table(){const o=options();return [['方案','聲學類型','資料來源','數量','RPM紀錄','合成噪音_dB','評估距離_m','總風量_CFM','風量達標','聲壓上限_dBA','上限餘裕_dB','計算狀態'],...last.map(({r,value:v,error})=>[r.name,o.basis,isDemo?'示範資料':sources[r.source],r.count,r.rpm,v?v.total.toFixed(4):'',o.basis==='LpA'?o.distance:'',v?.totalFlow??'',v?.flowPass===null?'未知':v?.flowPass?'是':'否',o.basis==='LpA'?o.limit:'',v?.margin??'',error||'完成'])];}
function download(text,type,name){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('scenarios').addEventListener('input',e=>{const key=e.target.dataset.key;if(!key)return;const i=Number(e.target.closest('[data-index]').dataset.index);rows[i][key]=e.target.value;if(['count','flow'].includes(key))rows[i].flowNote='已手動修改風量／數量。';isDemo=false;update();save();});
$('scenarios').addEventListener('click',async e=>{const article=e.target.closest('[data-index]');if(!article)return;const i=Number(article.dataset.index);
 if(e.target.closest('.remove')){rows.splice(i,1);isDemo=false;renderRows();update();save();}
 if(e.target.closest('.import')){try{const stored=JSON.parse(localStorage.getItem('fan-filter-v1'));if(!stored)throw Error('請先在同一瀏覽器的阻抗工具保存有效曲線。');if(stored.arrangement!=='parallel')throw Error('此功能適用相同风扇並聯；串聯請自行填入工作點風量。');const {calculate,FLOW}=await import('../fan-filter/calc.mjs?v=1.2');const result=calculate(stored);if(result.roots.length!==1||result.roots[0].coincident)throw Error('阻抗工具沒有唯一工作點，請先檢查曲線。');rows[i].count=stored.count;rows[i].flow=String(Number((result.roots[0].q/FLOW.CFM/Number(stored.count)).toPrecision(8)));rows[i].flowNote=`帶入 ${stored.fanName}：原阻抗情境 ${Number((result.roots[0].q/FLOW.CFM).toFixed(2))} CFM，${stored.count} 顆並聯，轉速比例 ${stored.speed}%。噪音仍需自行填對應條件。${stored.isDemo?'來源含示範曲線。':''}`;isDemo=false;renderRows();update();save();toast('已帶入工作點；請確認對應噪音資料。');}catch(err){toast(err.message);}}
});
for(const k of keys)$(k).addEventListener('input',()=>{if(k==='basis'){for(const r of rows)r.level='';isDemo=false;renderRows();toast('資料類型已切換，請重新填入對應的聲學數值。');}update();save();});
$('add').addEventListener('click',()=>{if(rows.length>=6){toast('第一版最多比較 6 個方案');return;}rows.push({name:'新方案',count:'1',level:'',distance:options().distance,flow:'',rpm:'',source:'vendor'});isDemo=false;renderRows();update();save();});
$('example').addEventListener('click',()=>{if(!isDemo&&!confirm('載入示範會取代目前方案，是否繼續？'))return;rows=structuredClone(demo);for(const [k,v] of Object.entries({basis:'LpA',flowTarget:'100',limit:'30',distance:'1',distanceMode:'same'}))$(k).value=v;isDemo=true;renderRows();update();save();});
$('csv').addEventListener('click',()=>{download('\uFEFF'+table().map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8','fan-noise-comparison.csv');toast('已產生比較 CSV');});
$('copy').addEventListener('click',async()=>{const text=table().map(r=>r.join('\t')).join('\n');try{await navigator.clipboard.writeText(text);toast('已複製比較表');}catch{$('copy-buffer').hidden=false;$('copy-buffer').value=text;$('copy-buffer').focus();$('copy-buffer').select();toast('請在資料框手動複製');}});
try{const saved=JSON.parse(localStorage.getItem('fan-noise-v1'));if(saved&&Array.isArray(saved.rows)&&saved.rows.length>0&&saved.rows.length<=6){rows=saved.rows;isDemo=saved.isDemo===true;for(const k of keys)if(saved.options?.[k]!==undefined)$(k).value=saved.options[k];}}catch{}renderRows();update();
let prompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;});$('install').addEventListener('click',async()=>{if(prompt){await prompt.prompt();prompt=null;}else toast('iPhone：Safari 分享選單 → 加入主畫面');});if(navigator.standalone||window.matchMedia('(display-mode: standalone)').matches){$('install').textContent='已安裝';$('install').disabled=true;}if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});

const extraIds=['sum-basis','sum-levels','prop-level','prop-from','prop-to'];let sumText='',propText='';
function updateExtras(){
 try{const levels=parseLevels($('sum-levels').value),total=combine(levels),dominant=Math.max(...levels),basis=$('sum-basis').value;
  $('sum-result').innerHTML=`${levels.length} 個聲源合成 ${basis}<strong>${fmt(total)} <small>${basis==='LpA'?'dBA':'dB re 1 pW'}</small></strong>比最大聲源 ${fmt(dominant)} 增加 ${fmt(total-dominant)} dB`;
  sumText=`噪音疊加 (${basis})\n聲源: ${levels.join(', ')}\n合成: ${total.toFixed(4)} ${basis==='LpA'?'dBA':'dB re 1 pW'}\n條件: 互不相關聲源；聲壓為同一評估位置。`;$('sum-copy').disabled=false;
 }catch(e){sumText='';$('sum-result').innerHTML=`<span class="fail">${esc(e.message)}</span>`;$('sum-copy').disabled=true;}
 try{const level=$('prop-level').value,r1=$('prop-from').value,r2=$('prop-to').value,value=distanceLevel(level,r1,r2),delta=value-Number(level);
  $('prop-result').innerHTML=`在 ${esc(r2)} m 的估算聲壓<strong>${fmt(value)} <small>dBA</small></strong>相較 ${esc(r1)} m：${delta>0?'增加':'降低'} ${fmt(Math.abs(delta))} dB`;
  const distances=[...new Set([.5,1,2,3,5,10,Number(r1),Number(r2)])].sort((a,b)=>a-b),data=distances.map(r=>({r,l:distanceLevel(level,r1,r)}));
  $('prop-table').innerHTML=data.map(({r,l})=>`<tr><td>${fmt(r,4)}</td><td>${fmt(l)}</td><td>${l-Number(level)>0?'+':''}${fmt(l-Number(level))}</td></tr>`).join('');
  const W=500,H=220,L=48,R=24,T=20,B=40,lo=Math.min(...data.map(p=>p.l))-3,hi=Math.max(...data.map(p=>p.l))+3,minR=Math.log10(distances[0]),maxR=Math.log10(distances.at(-1));
  const x=r=>L+(Math.log10(r)-minR)/(maxR-minR)*(W-L-R),y=l=>H-B-(l-lo)/(hi-lo)*(H-T-B);
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="聲壓隨距離變化圖"><rect width="${W}" height="${H}" fill="white"/>`;
  for(let i=0;i<=3;i++){const l=lo+(hi-lo)*i/3;svg+=`<path d="M${L},${y(l)}H${W-R}" stroke="#dce7ec"/><text x="${L-8}" y="${y(l)+4}" text-anchor="end" font-size="11" fill="#506b79">${fmt(l,1)}</text>`;}
  const samples=Array.from({length:61},(_,i)=>{const r=10**(minR+(maxR-minR)*i/60);return {r,l:distanceLevel(level,r1,r)};});svg+=`<path d="${samples.map((p,i)=>(i?'L':'M')+x(p.r)+','+y(p.l)).join(' ')}" fill="none" stroke="#28899b" stroke-width="3"/>`;
  for(const {r,l} of data)svg+=`<circle cx="${x(r)}" cy="${y(l)}" r="3" fill="${r===Number(r2)?'#b77759':'#28899b'}"><title>${r} m: ${l.toFixed(2)} dBA</title></circle>`;
  for(const r of [.5,1,2,5,10])if(r>=distances[0]&&r<=distances.at(-1))svg+=`<text x="${x(r)}" y="${H-B+16}" font-size="11" text-anchor="middle" fill="#506b79">${r}</text>`;
  svg+=`<text x="${L}" y="14" font-size="11" fill="#506b79">LpA (dBA)</text><text x="${W/2}" y="${H-5}" font-size="11" text-anchor="middle" fill="#506b79">距離 m · 對數刻度</text></svg>`;$('prop-chart').innerHTML=svg;
  propText='自由場遠場聲壓距離估算\n原量測: '+level+' dBA @ '+r1+' m\n距離_m\t聲壓_dBA\t差異_dB\n'+data.map(p=>[p.r,p.l.toFixed(4),(p.l-Number(level)).toFixed(4)].join('\t')).join('\n');$('prop-copy').disabled=false;
 }catch(e){propText='';$('prop-result').innerHTML=`<span class="fail">${esc(e.message)}</span>`;$('prop-chart').innerHTML='';$('prop-table').innerHTML='';$('prop-copy').disabled=true;}
}
function saveExtras(){try{localStorage.setItem('fan-noise-extras-v1',JSON.stringify(Object.fromEntries(extraIds.map(id=>[id,$(id).value]))));}catch{}}
for(const id of extraIds)$(id).addEventListener('input',()=>{if(id==='sum-basis'){$('sum-levels').value='';toast('請輸入所選聲學類型的數值。');}updateExtras();saveExtras();});
async function copyExtra(text){try{await navigator.clipboard.writeText(text);toast('已複製計算結果');}catch{$('extra-copy-buffer').hidden=false;$('extra-copy-buffer').value=text;$('extra-copy-buffer').focus();$('extra-copy-buffer').select();toast('請在資料框手動複製');}}
$('sum-copy').addEventListener('click',()=>{if(sumText)copyExtra(sumText);});$('prop-copy').addEventListener('click',()=>{if(propText)copyExtra(propText);});
try{const saved=JSON.parse(localStorage.getItem('fan-noise-extras-v1'));if(saved)for(const id of extraIds)if(saved[id]!==undefined)$(id).value=saved[id];}catch{}updateExtras();

const tabNames=['fans','addition','distance','speed'];
const hashTabs={'#speed':'speed','#noise-addition':'addition','#noise-distance':'distance','#fan-scenarios':'fans','#fans':'fans','#addition':'addition','#distance':'distance'};
function showTab(name,changeHash=false){
 if(!tabNames.includes(name))name='fans';
 for(const key of tabNames){const selected=key===name,button=$('tab-'+key);$('panel-'+key).hidden=!selected;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
 $('extra-copy-buffer').hidden=true;
 if(changeHash)history.replaceState(null,'','#'+name);
}
for(const name of tabNames){$('tab-'+name).addEventListener('click',()=>showTab(name,true));$('tab-'+name).addEventListener('keydown',e=>{
 let index=tabNames.indexOf(name);if(e.key==='ArrowRight')index=(index+1)%tabNames.length;else if(e.key==='ArrowLeft')index=(index+tabNames.length-1)%tabNames.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabNames.length-1;else return;e.preventDefault();showTab(tabNames[index],true);$('tab-'+tabNames[index]).focus();
});}
window.addEventListener('hashchange',()=>showTab(hashTabs[location.hash]||'fans'));showTab(hashTabs[location.hash]||'fans');


const speedIds=['derating-ambientMin','derating-ambientMax','speed-position','speed-tout1','speed-systemLossRatio','speed-componentLossRatio','speed-flowMode','speed-flowPoints','speed-limit','speed-tempLimit','speed-tin1','speed-tair1','speed-tcomp1','speed-tin2','speed-exponent','speed-flowUnit','speed-distance','speed-distanceMode','speed-count','speed-rpm','speed-level','speed-reference','speed-flow','speed-minSpeed','speed-model','speed-rpm2','speed-level2'];
let speedTable=[];

function updateSpeed(){
 $('derating-chart').replaceChildren();$('derating-summary').textContent='請完成有效的噪音、溫度與風量資料。';$('derating-table').replaceChildren();
 for(const id of ['rpm','flow','noise','air','temp','rise','base-rise','outlet'])$('compare-'+id).textContent='—';
 $('comparison-status').textContent='請完成有效資料，預估欄會自動更新。';
 $('speed-calibration').hidden=$('speed-model').value!=='calibrated';
 $('speed-flowData').hidden=$('speed-flowMode').value!=='measured';$('speed-flow').readOnly=$('speed-flowMode').value==='measured';$('speed-flowChart').innerHTML='';
 $('speed-tair1').value='';
 try{
  const localAir=localAirTemperature($('speed-tin1').value,$('speed-tout1').value,$('speed-position').value);$('speed-tair1').value=String(Number(localAir.toPrecision(10)));
  const scenario={flowMode:$('speed-flowMode').value,flowPoints:$('speed-flowPoints').value,count:$('speed-count').value,rpm:$('speed-rpm').value,level:$('speed-level').value,distance:$('speed-reference').value,flow:$('speed-flow').value,minSpeed:$('speed-minSpeed').value,speedModel:$('speed-model').value,rpm2:$('speed-rpm2').value,level2:$('speed-level2').value};
  const target={basis:'LpA',limit:$('speed-limit').value,distance:$('speed-distance').value,distanceMode:$('speed-distanceMode').value};
  const thermal={position:$('speed-position').value,outlet:$('speed-tout1').value,systemLossRatio:$('speed-systemLossRatio').value,componentLossRatio:$('speed-componentLossRatio').value,inlet:$('speed-tin1').value,ambient:$('speed-tair1').value,component:$('speed-tcomp1').value,targetInlet:$('speed-tin2').value,limit:$('speed-tempLimit').value,exponent:$('speed-exponent').value};
  const relation=createFlowRelation(scenario);if(scenario.flowMode==='measured'){$('speed-flow').value=String(Number(relation.baseFlow.toPrecision(10)));scenario.flow=relation.baseFlow;drawFlowRelation(relation,scenario);}
  const v=estimateThermalWindow(scenario,target,thermal),unit=$('speed-flowUnit').value;
  const comparison={outlet:fmt(v.outlet,1),rpm:fmt(v.rpm,0),flow:fmt(v.totalFlow/Number(scenario.count))+' '+unit,noise:fmt(v.noise-10*Math.log10(Number(scenario.count))),air:fmt(v.inlet,1),temp:fmt(v.temperature,1),rise:fmt(v.temperature-v.inlet,1),'base-rise':fmt(Number(thermal.component)-Number(thermal.ambient),1)};
  for(const [id,value] of Object.entries(comparison))$('compare-'+id).textContent=value;
  $('comparison-status').textContent=v.feasible?'預估欄：依最低可行轉速計算；聲壓為單顆在評估距離的數值。':'預估欄：無可行區間，以下僅為範圍內試算，不代表達標。';
  const status=v.feasible?'噪音與零件溫度皆初估達標 · 有可行區間':v.thermalRatio===null?'基準轉速仍超溫 · 降轉範圍內無解':'溫度／最低運轉要求高於噪音上限 · 無可行區間';
  const rpm=ratio=>fmt(ratio*Number(scenario.rpm),0)+' RPM';
  $('speed-output').innerHTML=`<h3>轉速限制結果</h3><p class="${v.feasible?'pass':'fail'}">${status}</p><div class="speed-metrics"><div><span>${v.thermalAtDataFloor?'資料範圍內最低已驗證轉速':'零件溫度要求的最低轉速'}</span><div class="${v.thermalRatio===null?'thermal-alert':''}"><b>${v.thermalRatio===null?'超出基準轉速':rpm(v.thermalRatio)}</b><p>${v.thermalRatio===null?'需改善散熱或重新建立基準':fmt(v.thermalRatio*100,1)+'%'}</p></div></div><div><span>噪音上限允許的最高轉速</span><b>${rpm(v.upper)}</b><p>${fmt(v.upper*100,1)}%</p></div><div><span>可行轉速區間 · 已含最低比例、風量及噪音資料範圍</span><b>${v.feasible?rpm(v.lower)+'–'+rpm(v.upper):'無交集'}</b></div></div><hr><h3>${v.feasible?'建議最低可行轉速':'範圍內試算 · 非可行建議'}：${fmt(v.rpm,0)} RPM</h3><div class="speed-metrics"><div><span>零件溫度初估</span><b class="${v.temperature>Number(thermal.limit)+1e-7?'temperature-over-limit':''}">${fmt(v.temperature,1)} °C</b><p>上限 ${esc(thermal.limit)} °C</p></div><div><span>合成聲壓初估</span><b>${fmt(v.noise)} dBA</b><p>@ ${esc(target.distance)} m</p></div><div><span>總風量初估</span><b>${fmt(v.totalFlow)} ${esc(unit)}</b><p>零件附近空氣 ${fmt(v.inlet,1)} °C</p></div></div><p class="note">整機損耗比 ${fmt(v.systemLossRatio,4)}，零件損耗比 ${fmt(v.componentLossRatio,4)}；${scenario.flowMode==='measured'?'使用實際風量資料內插':'風量按轉速正比初估'}，風量比 ${fmt(v.flowRatio,4)}。${v.thermalAtDataFloor?'更低轉速缺乏風量資料，不向下外插。':''}${v.feasible?'區間最低轉速使噪音較低，實務應保留溫度裕量。':'目前條件無法同時滿足，需改善散熱、噪音或重新建立基準資料。'}${v.acoustic.ceiling<Math.max(v.acoustic.lower,v.relation.minRatio)?'噪音要求已超出最低轉速／風量或噪音資料範圍。':''}所有結果為初估，需量測確認。</p>`;
  speedTable=[['項目','數值'],['判定',status],['顆數',scenario.count],['基準RPM',scenario.rpm],['基準單顆風量',scenario.flow],['風量單位',unit],['基準單顆LpA_dBA',scenario.level],['原量測距離_m',scenario.distance],['評估距離_m',target.distance],['距離處理',target.distanceMode],['噪音上限_dBA',target.limit],['零件溫度上限_C',thermal.limit],['基準入口_C',thermal.inlet],['位置係數_x',thermal.position],['基準出口_C',thermal.outlet],['預估出口_C',v.outlet],['基準附近空氣_C',thermal.ambient],['基準零件_C',thermal.component],['評估入口_C',thermal.targetInlet],['整機損耗比',v.systemLossRatio],['零件損耗比',v.componentLossRatio],['風量模式',scenario.flowMode],['實際RPM風量資料',scenario.flowMode==='measured'?scenario.flowPoints:''],['試算風量比',v.flowRatio],['熱下限是否受資料下界限制',v.thermalAtDataFloor?'是':'否'],['對流指數_m',thermal.exponent],['最低轉速比例_pct',scenario.minSpeed],['噪音模型',scenario.speedModel],['第二點RPM',scenario.speedModel==='calibrated'?scenario.rpm2:''],['第二點單顆LpA_dBA',scenario.speedModel==='calibrated'?scenario.level2:''],['噪音係數C',v.acoustic.coefficient],['溫度要求最低RPM',v.thermalRpm??'超出基準'],['噪音允許最高RPM',v.upper*Number(scenario.rpm)],['可行區間最低RPM',v.feasible?v.lower*Number(scenario.rpm):'無交集'],['可行區間最高RPM',v.feasible?v.upper*Number(scenario.rpm):'無交集'],['結果類型',v.feasible?'建議最低可行轉速':'無可行解試算'],['試算RPM',v.rpm],['試算零件_C',v.temperature],['試算合成LpA_dBA',v.noise],['試算總風量',v.totalFlow]];
  try{drawDeratingMap(calculateAmbientDeratingMap(scenario,target,thermal,{min:$('derating-ambientMin').value,max:$('derating-ambientMax').value}),thermal,target);}catch(e){$('derating-summary').textContent=e.message;}
  $('speed-copy').disabled=false;$('speed-csv').disabled=false;
 }catch(e){$('speed-output').innerHTML='<span class="fail">'+esc(e.message)+'</span>';speedTable=[];$('speed-copy').disabled=true;$('speed-csv').disabled=true;}
}
for(const id of speedIds)$(id).addEventListener('input',()=>{updateSpeed();try{localStorage.setItem('fan-noise-thermal-v1',JSON.stringify(Object.fromEntries(speedIds.map(k=>[k,$(k).value]))));$('speed-save').textContent='本頁輸入已獨立保存於本機。';}catch{$('speed-save').textContent='本機儲存不可用，請匯出結果。';}});
$('speed-copy').addEventListener('click',()=>{if(speedTable.length)copyExtra(speedTable.map(r=>r.join('\t')).join('\n'));});
$('speed-csv').addEventListener('click',()=>{if(speedTable.length)download('\uFEFF'+speedTable.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8','fan-noise-thermal-window.csv');});
try{const saved=JSON.parse(localStorage.getItem('fan-noise-thermal-v1'));if(saved){for(const id of speedIds)if(saved[id]!==undefined)$(id).value=saved[id];if(saved['speed-tout1']===undefined&&saved['speed-tair1']!==undefined){const ti=Number($('speed-tin1').value),ta=Number(saved['speed-tair1']);if(Number.isFinite(ti)&&Number.isFinite(ta)&&ta>=ti)$('speed-tout1').value=String(Number((ti+2*(ta-ti)).toPrecision(10)));}}}catch{}updateSpeed();



function drawFlowRelation(relation,scenario){
 const ps=relation.points,W=500,H=170,L=55,R=20,T=15,B=36,minN=ps[0].n,maxN=ps.at(-1).n,maxQ=Math.max(...ps.map(p=>p.q))*1.12;
 const x=n=>L+(n-minN)/(maxN-minN)*(W-L-R),y=q=>H-B-q/maxQ*(H-T-B);
 $('speed-flowChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="實際轉速風量資料曲線"><path d="M${L},${T}V${H-B}H${W-R}" fill="none" stroke="#8ea8b7"/><path d="${ps.map((p,i)=>(i?'L':'M')+x(p.n)+','+y(p.q)).join(' ')}" fill="none" stroke="#287da0" stroke-width="3"/>${ps.map(p=>`<circle cx="${x(p.n)}" cy="${y(p.q)}" r="4" fill="#287da0"><title>${p.n} RPM：${p.q}</title></circle>`).join('')}<text x="${L}" y="${H-12}" font-size="12" fill="#355767">${minN} RPM</text><text x="${W-R}" y="${H-12}" text-anchor="end" font-size="12" fill="#355767">${maxN} RPM</text><text x="${L}" y="12" font-size="12" fill="#355767">單顆風量 ${esc($('speed-flowUnit').value)}</text></svg>`;
}



function drawDeratingMap(map,thermal,target){
 const colors=['#17658c','#bd542f','#7751aa','#397a36','#be7010','#ad4073','#198479','#635bc6','#847224','#5e758b'];
 const W=500,H=365,L=69,R=22,T=28,B=59,ymin=Math.max(0,map.floor-.05),ymax=1.05;
 const x=a=>L+(a-map.min)/(map.max-map.min)*(W-L-R),y=r=>H-B-(r-ymin)/(ymax-ymin)*(H-T-B),xy=p=>x(p.ambient).toFixed(2)+','+y(p.ratio).toFixed(2);
 const parts=['<rect x="'+L+'" y="'+T+'" width="'+(W-L-R)+'" height="'+(H-T-B)+'" fill="#fcfdfc"/>'];
 parts.push('<rect x="'+L+'" y="'+y(map.floor)+'" width="'+(W-L-R)+'" height="'+(y(ymin)-y(map.floor))+'" fill="#e2e8ec"/>');
 const noiseY=y(Math.max(ymin,Math.min(ymax,map.ceiling)));
 parts.push('<rect x="'+L+'" y="'+T+'" width="'+(W-L-R)+'" height="'+(noiseY-T)+'" fill="#fae7e6"/>');
 for(let i=0;i<=5;i++){const ambient=map.min+(map.max-map.min)*i/5,xx=x(ambient);parts.push('<path d="M'+xx+','+T+' V'+(H-B)+'" stroke="#d7e1e5"/><text x="'+xx+'" y="'+(H-B+23)+'" text-anchor="'+(i===0?'start':i===5?'end':'middle')+'" font-size="16" fill="#345565">'+fmt(ambient,1)+'</text>');}
 for(let i=0;i<=5;i++){const r=map.floor+(1-map.floor)*i/5,yy=y(r);if(i>0&&map.floor===1)continue;parts.push('<path d="M'+L+','+yy+' H'+(W-R)+'" stroke="#d7e1e5" stroke-dasharray="3 5"/><text x="'+(L-7)+'" y="'+(yy+5)+'" text-anchor="end" font-size="16" fill="#345565">'+fmt(r*map.rpm,0)+'</text>');}
 if(map.selectedAmbient>=map.min&&map.selectedAmbient<=map.max)parts.push('<path d="M'+x(map.selectedAmbient)+','+T+' V'+(H-B)+'" stroke="#607684" stroke-dasharray="2 5"/>');
 // Each curve is split at its exact acoustic intersection; dashed parts fail the noise limit.
 map.levels.forEach((v,i)=>{
  for(const pass of [true,false]){const ps=v.points.filter(p=>p.ratio!==null&&(pass?p.ambient<=v.maxAmbient+1e-9&&v.maxAmbient!==null:p.ambient>=v.maxAmbient-1e-9||v.maxAmbient===null));if(!ps.length)continue;
   parts.push('<path d="M'+ps.map(xy).join(' L')+'" fill="none" stroke="'+colors[i]+'" stroke-width="2.5" '+(pass?'':'stroke-dasharray="5 4" opacity="0.55"')+'><title>'+Math.round(v.derating*100)+'% 保留倍率：'+(pass?'符合噪音上限':'超過噪音上限')+'</title></path>');}
  if(v.ratio!==null&&map.selectedAmbient>=map.min&&map.selectedAmbient<=map.max)parts.push('<circle cx="'+x(map.selectedAmbient)+'" cy="'+y(v.ratio)+'" r="3.2" fill="'+colors[i]+'"><title>'+Math.round(v.derating*100)+'%：'+fmt(map.selectedAmbient,1)+' °C，最低 '+Math.ceil(v.minRpm)+' RPM</title></circle>');
 });
 if(map.ceiling>=ymin&&map.ceiling<=ymax)parts.push('<path d="M'+L+','+noiseY+' H'+(W-R)+'" stroke="#a33024" stroke-width="2.5" stroke-dasharray="8 5"/>');
 parts.push('<path d="M'+L+','+T+' V'+(H-B)+' H'+(W-R)+'" fill="none" stroke="#617c8c"/><text x="'+L+'" y="18" font-size="17" fill="#173f55">最低所需轉速（RPM）</text><text x="'+((L+W-R)/2)+'" y="'+(H-13)+'" text-anchor="middle" font-size="17" fill="#173f55">環溫／入口空氣溫度（°C）</text>');
 $('derating-chart').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="不同環溫下，各功率保留倍率的最低所需轉速；紅色水平虛線為噪音允許最高轉速">'+parts.join('')+'</svg>';
 $('derating-legend').innerHTML=map.levels.map((v,i)=>'<span><i style="background:'+colors[i]+'"></i>'+Math.round(v.derating*100)+'%</span>').join('');
 $('derating-summary').textContent='噪音允許最高轉速：'+fmt(map.ceiling*map.rpm,0)+' RPM（'+fmt(Number(target.limit))+' dBA）；零件上限 '+fmt(Number(thermal.limit))+' °C。對每條降載線，線上方且紅色噪音線下方才是可用轉速；實線為有交集，虛線為噪音不達標。';
 $('derating-current').textContent='目前環溫 '+fmt(map.selectedAmbient,1)+' °C 的轉速區間（沿用上方「預估入口空氣」設定）';
 $('derating-table').innerHTML=map.levels.map((v,i)=>'<tr><th scope="row"><span style="color:'+colors[i]+'">●</span> '+Math.round(v.derating*100)+'%</th><td>'+(v.feasible?fmt(Math.ceil(v.minRpm),0)+'～'+fmt(Math.floor(v.maxRpm),0)+' RPM':v.minRpm===null?'超出基準轉速':fmt(Math.ceil(v.minRpm),0)+' RPM 起')+'</td><td class="'+(v.feasible?'derating-pass':'derating-fail')+'">'+(v.feasible?'可用':'無交集')+'</td></tr>').join('');
}
