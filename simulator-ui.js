/* Browser UI for VNR Scenario Lab. All positions are synthetically generated, never live GPS. */
(function(){
'use strict';
const $=id=>document.getElementById(id),TZ=7*3600000,MIN=60000;
const pad=n=>String(n).padStart(2,'0');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timeText=t=>new Date(t+TZ).toISOString().slice(11,19);
const shortTime=t=>timeText(t).slice(0,5);
const fullTime=t=>new Date(t+TZ).toISOString().slice(0,16).replace('T',' ');
const shortDate=t=>new Date(t+TZ).toISOString().slice(5,10).split('-').reverse().join('/');
const f1=n=>Number(n).toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});
const f3=n=>Number(n).toLocaleString('vi-VN',{minimumFractionDigits:3,maximumFractionDigits:3});
const delayText=sec=>sec>60?'+'+Math.ceil(sec/60)+' phút':sec< -60?'-'+Math.ceil(-sec/60)+' phút':'±0 phút';
const delayClass=sec=>sec>60?'late':sec< -60?'early':'on';
const STATUS={RUNNING:'Trên tuyến',APPROACHING:'Sắp tới ga',AT_STATION:'Đang dừng ga',INCIDENT:'ĐANG DỪNG DO SỰ CỐ'};
const TYPES={signal:'Dừng chờ tín hiệu',technical:'Sự cố kỹ thuật đầu máy',crossing:'Sự cố tại đường ngang',obstruction:'Chướng ngại trên đường ray'};
let engine=null,selectedKey=null,searchText='',mode='live',rate=1,virtualTime=Date.now(),realAnchor=Date.now(),focusedMap=false,latest=[],lastTick=null;
let toastTimer=0;
function toast(message){const e=$('toast');e.textContent=message;e.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{e.hidden=true},4200)}
function nowSim(){
 if(mode==='live')return Date.now();
 if(mode==='paused')return virtualTime;
 return virtualTime+(Date.now()-realAnchor)*rate;
}
function setSimTime(time,nextMode){
 virtualTime=time;realAnchor=Date.now();mode=nextMode;
 render();
}
function setRate(next){
 const timestamp=nowSim();
 rate=Number(next);
 $('play-rate').value=String(rate);
 if(rate===1){setSimTime(Date.now(),'live');toast('1×: Đồng bộ theo giờ Việt Nam. GPS và ETA đều là dữ liệu GIẢ LẬP.')}
 else {setSimTime(timestamp,'replay');toast('Tua nhanh '+rate+'× từ thời điểm đang xem.')}
}
function getTrip(k){if(!k)return null;const a=k.split('|');return engine.trip(a[0],a[1])}
function zoneLabel(z){return window.VNRSIM.zoneVN(z)}
function kpiText(v){return String(v).padStart(2,'0')}
function renderKPIs(data){
 $('kpi-active').textContent=kpiText(data.length);
 $('kpi-delayed').textContent=kpiText(data.filter(x=>x.delaySec>300).length);
 $('kpi-incident').textContent=kpiText(data.filter(x=>x.status==='INCIDENT').length);
 const avg=data.length?data.reduce((n,x)=>n+x.delaySec,0)/60/data.length:0;
 $('kpi-delta').textContent=(avg>0?'+':'')+f1(avg)+'′';
}
function svgCoords(lat,lon){return{x:(lon-103)*125+80,y:(22.8-lat)*54+48}}
function svgLine(points){return points.map(p=>{const v=svgCoords(p.lat,p.lon);return v.x.toFixed(1)+','+v.y.toFixed(1)}).join(' ')}
function renderMap(list,selected){
 const el=$('sim-map'),stations=engine.getStations();
 const svgParts=['<defs><radialGradient id="oceanGlow" cx="75%" cy="48%" r="85%"><stop stop-color="#1a4b5b"/><stop offset="1" stop-color="#0b2a3a"/></radialGradient><filter id="markerGlow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#021b25" flood-opacity=".8"/></filter></defs>'];
 svgParts.push('<rect width="1000" height="740" fill="url(#oceanGlow)"/>');
 for(let x=55;x<1000;x+=100)svgParts.push('<line class="gridline" x1="'+x+'" x2="'+x+'" y1="0" y2="740"/>');
 for(let y=40;y<740;y+=86)svgParts.push('<line class="gridline" x1="0" x2="1000" y1="'+y+'" y2="'+y+'"/>');
 for(let lat=22;lat>=11;lat-=3){const y=svgCoords(lat,103).y;svgParts.push('<text class="latlon-label" x="17" y="'+y.toFixed(1)+'">'+lat+'°B</text>')}
 const major=stations.filter(s=>['Hà Nội','Sài Gòn','Biên Hòa','Đà Nẵng','Huế','Nha Trang','Vinh','Đồng Hới','Thanh Hoá','Nam Định','Diêu Trì','Quảng Ngãi','Bình Thuận'].includes(s.name));
 for(const s of major){const p=svgCoords(s.lat,s.lon);svgParts.push('<circle class="zone-urban" cx="'+p.x+'" cy="'+p.y+'" r="29"/>')}
 const allpoints=svgLine(stations);
 svgParts.push('<polyline class="track-halo" points="'+allpoints+'"/><polyline class="track-line" points="'+allpoints+'"/>');
 if(selected){
  const northKm=selected.lineKm;
  const path=selected.direction==='south'?stations.filter(s=>s.km<=northKm):stations.filter(s=>s.km>=northKm).reverse();
  path.push({lat:selected.lat,lon:selected.lon});
  svgParts.push('<polyline class="trail" points="'+svgLine(path)+'"/>');
 }
 for(const st of stations){
  const pos=svgCoords(st.lat,st.lon),isMajor=major.some(s=>s.id===st.id);
  svgParts.push('<circle class="station" cx="'+pos.x+'" cy="'+pos.y+'" r="'+(isMajor?4.5:2.3)+'"/>');
  if(isMajor){
    const align=st.name==='Hà Nội'||st.name==='Đà Nẵng'||st.name==='Nha Trang'?'end':'start';
    const offset=align==='end'?-11:10;
    svgParts.push('<text class="station-label" x="'+(pos.x+offset)+'" y="'+(pos.y-8)+'" text-anchor="'+align+'">'+escapeHTML(st.name)+'</text>');
  }
 }
 for(const rec of list){
  const p=svgCoords(rec.lat,rec.lon),chosen=selected&&rec.tripKey===selected.tripKey;
  const color=chosen?'#eeb367':rec.direction==='south'?'#20b49e':'#4d9bce';
  const statusOutline=rec.status==='INCIDENT'?'#ff654b':'#e7f9f3';
  svgParts.push('<g class="train" data-key="'+escapeHTML(rec.tripKey)+'" tabindex="0" role="button" aria-label="Chọn '+escapeHTML(rec.trainId)+'">');
  if(chosen)svgParts.push('<circle class="sim-pulse" cx="'+p.x+'" cy="'+p.y+'" r="27"/>');
  svgParts.push('<circle class="train-body" cx="'+p.x+'" cy="'+p.y+'" r="'+(chosen?19:14)+'" fill="'+color+'" stroke="'+statusOutline+'" filter="url(#markerGlow)"/><text class="train-text" x="'+p.x+'" y="'+(p.y+1)+'">'+escapeHTML(rec.trainId)+'</text></g>');
 }
 el.innerHTML=svgParts.join('');
 if(focusedMap&&selected){
  const p=svgCoords(selected.lat,selected.lon);
  const x=clamp(p.x-270,0,460),y=clamp(p.y-180,0,380);
  el.setAttribute('viewBox',[x,y,540,360].join(' '));
 }else el.setAttribute('viewBox','0 0 1000 740');
 $('follow-map').textContent=focusedMap?'◎ Về toàn tuyến':'◎ Phóng tới tàu';
}
function renderFeed(list){
 const q=searchText.toLowerCase();
 const shown=list.filter(rec=>rec.trainId.toLowerCase().includes(q)||rec.nextStation.toLowerCase().includes(q)).sort((a,b)=>{
  if(a.tripKey===selectedKey)return-1;if(b.tripKey===selectedKey)return 1;
  return a.trainId.localeCompare(b.trainId)||a.departureDay.localeCompare(b.departureDay);
 });
 $('feed-count').textContent=shown.length+' chuyến';
 $('train-feed').innerHTML=shown.length?shown.map(r=>
  '<button type="button" role="listitem" class="train-row '+(r.tripKey===selectedKey?'active':'')+'" data-key="'+escapeHTML(r.tripKey)+'">'+
  '<span class="train-id">'+escapeHTML(r.trainId)+'</span>'+
  '<span class="train-summary"><strong>→ '+escapeHTML(r.nextStation)+'</strong><small>Km '+f1(r.lineKm)+' · '+f1(r.speedKmh)+' km/h</small></span>'+
  '<span class="diff '+delayClass(r.delaySec)+'">'+delayText(r.delaySec)+'</span></button>'
 ).join(''):'<p class="empty-message">Không tìm thấy mác tàu tại thời điểm đã chọn.</p>';
}
function renderSelected(r){
 const box=$('selected-detail');
 if(!r){box.innerHTML='<div class="card-head"><div><span class="eyebrow">TELEMETRY STREAM</span><h2>Chuyến được theo dõi</h2></div></div><p class="empty-message">Không có dữ liệu vị trí tại thời điểm này.</p>';return}
 const status=STATUS[r.status]||'Mô phỏng';
 const coordinates=r.lat.toFixed(5)+'°N, '+r.lon.toFixed(5)+'°E';
 const deltaClass=delayClass(r.delaySec);
 const chunk=[
 '<div class="card-head"><div><span class="eyebrow">TELEMETRY STREAM · ẢO</span><h2>Chuyến được theo dõi</h2></div><span class="small-tag">GPS GIẢ LẬP</span></div>',
 '<div class="selected-top"><div><strong>'+escapeHTML(r.trainId)+'</strong><small>Chuyến '+escapeHTML(r.departureDay)+' · '+(r.direction==='south'?'Bắc → Nam':'Nam → Bắc')+'</small></div><span class="status-chip '+(r.status==='INCIDENT'?'incident':'')+'">'+escapeHTML(status)+'</span></div>',
 '<div class="detail-metrics">',
 '<div class="detail-metric"><span>Vận tốc mô phỏng</span><strong>'+f1(r.speedKmh)+' <small>km/h</small></strong></div>',
 '<div class="detail-metric"><span>Lý trình (HN → SG)</span><strong>'+f3(r.lineKm)+' <small>km</small></strong></div>',
 '<div class="detail-metric"><span>Khu vực đang qua</span><strong>'+escapeHTML(r.zoneName)+'</strong></div>',
 '<div class="detail-metric"><span>Ga gần kế tiếp</span><strong>'+escapeHTML(r.nextStation)+'</strong></div>',
 '<div class="detail-metric"><span>ETA ga (giả lập)</span><strong>'+shortTime(r.etaNextMs)+'</strong></div>',
 '<div class="detail-metric"><span>So với giờ dự kiến</span><strong class="diff '+deltaClass+'">'+delayText(r.delaySec)+'</strong></div>',
 '</div>',
 '<div class="detail-location"><strong>GPS giả lập</strong> · '+coordinates+'<br><code>'+r.lat.toFixed(6)+', '+r.lon.toFixed(6)+'</code><br>Ga trước: '+escapeHTML(r.previousStation)+' · Ga tới: '+escapeHTML(r.nextStation)+' · Còn '+f1(r.remainingKm)+' km'+(r.activeEvent?'<br><b>⚠ '+escapeHTML(r.activeEvent.label)+' · còn '+Math.ceil(r.waitRemainingSec/60)+' phút</b>':'')+'</div>',
 '<p class="detail-meta">Dữ liệu nội suy từ tọa độ 38 ga tham chiếu · sai số mô hình không xác định · accuracyM='+r.accuracyM+' chỉ là tham số giả lập, không phải độ chính xác được kiểm chứng · '+timeText(r.utcMs)+' ICT</p>'
 ];
 box.innerHTML=chunk.join('');
}
function renderSchedule(r,trip,t){
 if(!r||!trip){$('schedule-rows').innerHTML='<tr><td colspan="4">Chưa có dữ liệu chuyến tàu</td></tr>';return}
 const future=trip.stationRows.filter(row=>row.actualMs>=t-2*MIN).slice(0,10);
 $('schedule-rows').innerHTML=future.length?future.map((row,i)=>{
  const delay=Math.round((row.actualMs-row.scheduledMs)/1000),status=delayClass(delay);
  return '<tr class="'+(i===0?'next-row':'')+'"><td>'+escapeHTML(row.name)+'</td><td>'+shortTime(row.scheduledMs)+'<small class="minor">'+shortDate(row.scheduledMs)+'</small></td>'+
    '<td>'+shortTime(row.actualMs)+'<small class="minor">'+shortDate(row.actualMs)+'</small></td><td class="diff '+status+'">'+delayText(delay)+'</td></tr>';
 }).join(''):'<tr><td colspan="4">Hành trình kết thúc theo kịch bản.</td></tr>';
}
function renderEvents(list,r,trip,t){
 let events=[];
 for(const item of list){
  if(item.delaySec>600)events.push({severity:'alert',name:item.trainId+' · ETA chậm '+Math.ceil(item.delaySec/60)+' phút',desc:'Ga '+item.nextStation+' · dự báo theo kịch bản '+zoneLabel(item.zone),when:t});
  if(item.status==='INCIDENT')events.push({severity:'alert',name:item.trainId+' · '+item.activeEvent.label,desc:'Dừng mô phỏng tại km '+f1(item.lineKm),when:t});
 }
 if(trip&&r){
  for(const e of trip.events.filter(ev=>ev.beginMs<=t+2*3600000&&ev.finishMs>=t-90*MIN)){
   events.push({severity:'alert',name:trip.trainId+' · '+e.label,desc:'Sự cố '+Math.round(e.durationSec/60)+' phút tại km '+f1(e.routeKm)+' · '+(t<e.beginMs?'Sắp xảy ra':t>e.finishMs?'Đã kết thúc':'Đang xảy ra'),when:e.beginMs});
  }
  if(r.zone==='urban'&&r.status==='RUNNING')events.push({severity:'info',name:r.trainId+' · Vào vùng đô thị giả định',desc:'Áp dụng đặc tính tốc độ mẫu của khu vực đô thị, không phải giới hạn pháp lý',when:t});
 }
 if(!events.length){
  events=[{severity:'info',name:'Không có sự cố nổi bật trong thời điểm mô phỏng',desc:'Chọn kịch bản mưa lớn / giảm tốc hoặc chèn sự cố để quan sát diễn biến ETA và độ trễ.',when:t}];
 }
 events.sort((a,b)=>a.severity==='alert'&&b.severity!=='alert'?-1:b.severity==='alert'&&a.severity!=='alert'?1:b.when-a.when);
 $('event-count').textContent=events.filter(x=>x.severity==='alert').length+' cảnh báo';
 $('event-list').innerHTML=events.slice(0,14).map(x=>'<div class="event-item '+(x.severity==='info'?'good':'')+'"><div><strong>'+escapeHTML(x.name)+'</strong><p>'+escapeHTML(x.desc)+'</p></div><time>'+shortTime(x.when)+'</time></div>').join('');
}
function fillClock(t){$('clock-ict').textContent=timeText(Date.now())+' ICT';$('mode-indicator').textContent=mode==='live'?'1× · Theo giờ ICT':mode==='replay'?rate+'× · Tua nhanh':'Ⅱ Tạm dừng';$('pause-run').textContent=mode==='paused'?'▶ Tiếp tục':'Ⅱ Tạm dừng';$('playback-state').textContent=(mode==='live'?'1× · Giờ Việt Nam tự cập nhật':mode==='replay'?'Tua mô phỏng với tốc độ '+rate+'×':'Đã tạm dừng')+' · '+fullTime(t)+' ICT';}
function render(){
 if(!engine)return;
 const t=nowSim(),all=engine.servicesAt(t);
 latest=all;
 if(!all.some(r=>r.tripKey===selectedKey))selectedKey=all[0]?.tripKey||null;
 const r=all.find(x=>x.tripKey===selectedKey)||null,trip=getTrip(selectedKey);
 renderKPIs(all);renderMap(all,r);renderFeed(all);renderSelected(r);renderSchedule(r,trip,t);renderEvents(all,r,trip,t);fillClock(t);
 $('at-time').value=new Date(t+TZ).toISOString().slice(0,16);
 try{window.dispatchEvent(new CustomEvent('vnr-synthetic-telemetry',{detail:{simulated:true,utcMs:t,records:all}}))}catch(e){}
 window.VNR_SimLastSnapshot={synthetic:true,utcMs:t,records:all};
}
function selectTrain(k){selectedKey=k;render()}
function applyScenario(){
 const scenario=$('scenario').value,seed=clamp(Number($('seed').value)||2026,1,999999999),focusTrain=$('focus-train').value;
 engine.clearIncidents();engine.setOptions({scenario,seed,focusTrain});
 toast('Đã nạp: '+engine.getModeLabel()+'. Độ trễ và vị trí được tính lại từ đầu.');
 render();
}
function injectNow(){
 const t=nowSim(),all=engine.servicesAt(t),r=all.find(x=>x.tripKey===selectedKey);
 if(!r){toast('Hãy chọn một chuyến đang trên tuyến để chèn sự cố.');return}
 const trip=getTrip(r.tripKey),leg=trip.legs.find(l=>r.routeKm>=l.from.km&&r.routeKm<l.to.km);
 if(!leg){toast('Tàu hiện đang dừng tại mốc ga; hãy chọn thời điểm đang chạy trên chặng.');return}
 const type=$('incident-type').value,durationMin=Number($('delay-duration').value);
 const km=clamp(r.routeKm+.003,leg.from.km+.004,leg.to.km-.004);
 try{
  engine.inject({tripKey:r.tripKey,km,type,durationMin,label:TYPES[type]+' (giả lập)'});
  toast('Đã chèn '+TYPES[type].toLowerCase()+' '+durationMin+' phút ở km '+f1(km)+'. Hãy quan sát ETA và độ trễ.');
  render();
 }catch(e){toast('Không chèn được: '+e.message)}
}
function downloadData(format){
 const start=nowSim(),span=Number($('export-range').value),step=Number($('export-step').value);
 const scope=$('export-scope').value;
 const trainId=scope==='selected'?selectedKey?.split('|')[0]:null;
 if(scope==='selected'&&!selectedKey){toast('Chọn chuyến trước khi xuất dữ liệu.');return}
 const raw=engine.exportRecords({startMs:start,endMs:start+span*MIN,stepSec:step,trainId,maxRows:20000});
 const records=scope==='selected'?raw.filter(x=>x.tripKey===selectedKey):raw;
 if(!records.length){toast('Không có bản ghi trong khoảng xuất.');return}
 const header=['isoTime','tripKey','trainId','departureDay','lat','lon','accuracyM','lineKm','routeKm','speedKmh','zone','status','previousStation','nextStation','plannedNextMs','etaNextMs','delaySec','remainingKm','source','synthetic'];
 const meta={generator:'VNR Scenario Lab',synthetic:true,warning:'GIẢ LẬP / KHÔNG PHẢI GPS THẬT',scenario:engine.getOptions(),sourceSchedule:'https://giotaugiave.dsvn.vn/Default.aspx',createdAt:new Date().toISOString(),generatedRows:records.length,limit:20000};
 let body,mime,ext;
 if(format==='json'){body=JSON.stringify({metadata:meta,records},null,2);mime='application/json';ext='json'}
 else if(format==='ndjson'){body=JSON.stringify({type:'metadata',...meta})+'\n'+records.map(x=>JSON.stringify(x)).join('\n');mime='application/x-ndjson';ext='ndjson'}
 else{
  const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  body='\uFEFF'+header.map(cell).join(',')+'\r\n'+records.map(r=>header.map(h=>cell(r[h])).join(',')).join('\r\n');
  mime='text/csv;charset=utf-8';ext='csv';
 }
 const url=URL.createObjectURL(new Blob([body],{type:mime})),a=document.createElement('a');
 a.href=url;a.download='vnr-synthetic-'+engine.getOptions().scenario+'-'+engine.dayKey(start)+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast('Đã xuất '+records.length.toLocaleString('vi-VN')+' bản ghi '+ext.toUpperCase()+(raw.length>=20000?' (đạt giới hạn 20.000 bản ghi).':'')+'.');
}
function register(){
 $('apply-scenario').addEventListener('click',applyScenario);
 $('play-rate').addEventListener('change',e=>setRate(e.target.value));
 $('run-live').addEventListener('click',()=>{rate=1;$('play-rate').value='1';setSimTime(Date.now(),'live');toast('Đã đồng bộ về giờ Việt Nam. Toàn bộ dữ liệu chỉ là giả lập.')});
 $('pause-run').addEventListener('click',()=>{
  if(mode!=='paused')setSimTime(nowSim(),'paused');
  else if(rate===1)setSimTime(Date.now(),'live');
  else setSimTime(virtualTime,'replay');
 });
 $('step-5').addEventListener('click',()=>setSimTime(nowSim()+5*MIN,'paused'));
 $('at-time').addEventListener('change',e=>{
  const val=e.target.value;if(!val)return;const t=Date.parse(val+':00+07:00');
  if(Number.isFinite(t)){setSimTime(t,'paused');toast('Đang xem thời điểm '+fullTime(t)+' theo lịch mô phỏng.')}
 });
 $('delay-duration').addEventListener('input',e=>$('duration-display').textContent=e.target.value+' phút');
 $('inject-incident').addEventListener('click',injectNow);
 $('clear-incidents').addEventListener('click',()=>{engine.clearIncidents();render();toast('Đã xóa tất cả sự cố chèn thủ công.')});
 $('download-json').addEventListener('click',()=>downloadData('json'));
 $('download-csv').addEventListener('click',()=>downloadData('csv'));
 $('download-ndjson').addEventListener('click',()=>downloadData('ndjson'));
 $('search-train').addEventListener('input',e=>{searchText=e.target.value.trim();renderFeed(latest)});
 $('train-feed').addEventListener('click',e=>{const btn=e.target.closest('[data-key]');if(btn)selectTrain(btn.dataset.key)});
 $('sim-map').addEventListener('click',e=>{const node=e.target.closest('[data-key]');if(node)selectTrain(node.getAttribute('data-key'))});
 $('sim-map').addEventListener('keydown',e=>{const node=e.target.closest('[data-key]');if(node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectTrain(node.getAttribute('data-key'))}});
 $('follow-map').addEventListener('click',()=>{focusedMap=!focusedMap;render()});
}
async function init(){
 if(!window.VNRSIM)throw Error('Không tải được mô-đun sinh dữ liệu.');
 const resp=await fetch('./data/rail-schedules.json',{cache:'no-store'});
 if(!resp.ok)throw Error('Không tải được lịch tàu: HTTP '+resp.status);
 const data=await resp.json();
 engine=window.VNRSIM.create(data,{scenario:'normal',seed:2026,focusTrain:'SE1'});
 $('focus-train').innerHTML=data.trains.map(t=>'<option value="'+escapeHTML(t.id)+'">'+escapeHTML(t.id)+'</option>').join('');
 $('focus-train').value='SE1';
 register();render();setInterval(()=>{if(mode!=='paused')render();else fillClock(nowSim())},1000);
 window.VNR_Sim={
  snapshot:()=>({simulated:true,utcMs:nowSim(),records:engine.servicesAt(nowSim())}),
  options:()=>engine.getOptions(),setScenario:options=>{engine.clearIncidents();engine.setOptions(options);render()},
  incident:args=>{const event=engine.inject(args);render();return event},clear:()=>{engine.clearIncidents();render()},
  exportRecords:args=>engine.exportRecords(args),trip:(id,date)=>engine.trip(id,date),engine:()=>engine
 };
}
init().catch(error=>{console.error(error);document.querySelector('.main').insertAdjacentHTML('afterbegin','<div class="warning"><b>Không khởi tạo được mô phỏng:</b> '+escapeHTML(error.message)+' · Mở trang thông qua HTTPS/GitHub Pages thay vì tệp file://.</div>');toast('Không khởi chạy mô phỏng: '+error.message)});
})();