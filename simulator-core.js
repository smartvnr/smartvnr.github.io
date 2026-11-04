/* Vietnam Rail Map — deterministic SYNTHETIC operations telemetry generator.
   Source schedules: public Vietnam Railways reference. Zone/speed/incident models are illustrative,
   NOT official speed limits, NOT live GPS, NOT dispatching data. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VNRSIM=api;
})(typeof window!=='undefined'?window:this,function(){
'use strict';
const MIN=60000,DAY=86400000,TZ=7*3600000;
const MAJOR=['Hà Nội','Sài Gòn','Biên Hòa','Dĩ An','Đà Nẵng','Huế','Nha Trang','Vinh','Đồng Hới','Thanh Hoá','Nam Định','Diêu Trì','Quảng Ngãi','Bình Thuận'];
const SCENARIOS={
 normal:{name:'Vận hành thông thường',urban:1.00,rural:1.00,noise:0.018,dwell:55},
 urban:{name:'Chậm qua đô thị/khu dân cư',urban:0.66,rural:1.00,noise:0.015,dwell:85},
 weather:{name:'Mưa lớn / hạn chế tốc độ (giả định)',urban:0.84,rural:0.76,noise:0.025,dwell:65},
 recovery:{name:'Chạy bù giờ (giả định)',urban:1.03,rural:1.10,noise:0.015,dwell:25},
 incident:{name:'Sự cố tín hiệu và dừng tàu',urban:0.94,rural:0.98,noise:0.02,dwell:60}
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dayKey=t=>new Date(t+TZ).toISOString().slice(0,10);
const dayStart=s=>Date.parse(s+'T00:00:00+07:00');
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rnd=s=>{let n=fnv(s);n=(n+0x6d2b79f5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296};
const nameToZoneDistance=(northKm,stations)=>{
 let nearest=Infinity,major=Infinity;
 for(const st of stations){let d=Math.abs(st.km-northKm);nearest=Math.min(nearest,d);if(MAJOR.includes(st.name))major=Math.min(major,d)}
 if(major<8)return'urban';
 if(major<18||nearest<5)return'residential';
 return'rural';
};
const zoneVN=z=>({urban:'Đô thị',residential:'Khu dân cư',rural:'Khu thưa dân cư'})[z]||z;
function normalize(data){
 if(!data||!Array.isArray(data.stations)||!Array.isArray(data.trains))throw Error('Missing timetable');
 const stations=data.stations.slice().sort((a,b)=>a.km-b.km);
 if(stations.length<2)throw Error('Not enough station coordinates');
 return{stations,trains:data.trains,byId:Object.fromEntries(stations.map(s=>[s.id,s]))};
}
function routePoint(km,stations){
 km=clamp(km,stations[0].km,stations[stations.length-1].km);
 let lo=0,hi=stations.length-2;
 while(lo<hi){const mid=Math.floor((lo+hi+1)/2);if(stations[mid].km<=km)lo=mid;else hi=mid-1}
 const a=stations[lo],b=stations[lo+1],f=clamp((km-a.km)/(b.km-a.km||1),0,1);
 return{lat:a.lat+(b.lat-a.lat)*f,lon:a.lon+(b.lon-a.lon)*f};
}
function create(data,initial){
 const d=normalize(data);
 let config=Object.assign({scenario:'normal',seed:2026,focusTrain:'SE1'},initial||{});
 let version=0;
 let overrides=[];
 const cached=new Map();
 const profileCache=new Map();
 const scenario=()=>SCENARIOS[config.scenario]||SCENARIOS.normal;
 const trainById=Object.fromEntries(d.trains.map(t=>[t.id,t]));
 const totalKm=d.stations[d.stations.length-1].km;
 function normNorth(train,km){return train.direction==='south'?km:totalKm-km}
 function zoneAt(train,km){
  const z=nameToZoneDistance(normNorth(train,km),d.stations);
  return z;
 }
 function speedWeight(train,km,start,end,profile){
  const z=zoneAt(train,km),s=scenario(),zoneFactor=z==='urban'?0.52*s.urban:z==='residential'?0.78*(0.7+0.3*s.urban):1.06*s.rural;
  const edge=clamp(Math.min(km-start,end-km)/6,0,1);
  return Math.max(.14,zoneFactor*(.40+.60*edge));
 }
 function makeProfile(train,a,b){
  const N=Math.max(40,Math.min(180,Math.ceil((b.km-a.km)*2)));
  const x=[0],w=[0],distance=b.km-a.km;
  let total=0,counts={urban:0,residential:0,rural:0};
  for(let i=1;i<=N;i++){
    const from=(i-1)/N,to=i/N,mid=a.km+distance*(from+to)/2;
    const zone=zoneAt(train,mid);counts[zone]++;
    const v=speedWeight(train,mid,a.km,b.km);
    total+=distance/N/v;
    x.push(to);w.push(total);
  }
  return{x,w,total,counts,distance};
 }
 function fracAt(profile,elapsedFraction){
  const val=clamp(elapsedFraction,0,1)*profile.total;
  let lo=0,hi=profile.w.length-1;
  while(lo<hi){const md=Math.floor((lo+hi)/2);if(profile.w[md]<val)lo=md+1;else hi=md}
  const i=clamp(lo,1,profile.w.length-1),dt=profile.w[i]-profile.w[i-1]||1;
  const f=clamp((val-profile.w[i-1])/dt,0,1);
  return{fraction:profile.x[i-1]+(profile.x[i]-profile.x[i-1])*f,cell:i};
 }
 function timeFracAt(profile,distanceFraction){
  const f=clamp(distanceFraction,0,1),x=f*(profile.x.length-1),i=Math.min(profile.x.length-2,Math.floor(x));
  return(profile.w[i]+(profile.w[i+1]-profile.w[i])*(x-i))/profile.total;
 }
 function tripKey(trainId,departureDay){return trainId+'|'+departureDay}
 function build(trainId,departureDay){
  const key=tripKey(trainId,departureDay),cacheKey=key+'|'+version;
  if(cached.has(cacheKey))return cached.get(cacheKey);
  const train=trainById[trainId];if(!train)throw Error('Unknown train: '+trainId);
  const stops=train.stops;
  const initialMs=dayStart(departureDay)+stops[0].minute*MIN;
  let cursor=initialMs;
  const legs=[],events=[],stationRows=[];
  stationRows.push({name:d.byId[stops[0].station].name,scheduledMs:initialMs,actualMs:initialMs,km:stops[0].km,stationId:stops[0].station});
  for(let i=0;i<stops.length-1;i++){
    const a=stops[i],b=stops[i+1];
    if(!(b.km>a.km&&b.minute>a.minute))throw Error('Unordered schedule '+key+' leg '+i);
    const profile=makeProfile(train,a,b);
    const secScheduled=(b.minute-a.minute)*60;
    const r=rnd(key+'|'+config.seed+'|'+i);
    const sc=scenario();
    const zonePenalty=(profile.counts.urban/profile.x.length)*(1/sc.urban-1)+(profile.counts.rural/profile.x.length)*(1/sc.rural-1)*.7;
    let factor=1+(r-.5)*2*sc.noise+zonePenalty;
    if(config.scenario==='recovery')factor-=.015;
    let movingSeconds=Math.max((b.km-a.km)/88*3600,secScheduled*factor);
    // Synthetic illustrative category caps (urban 65, residential 75, rural 90 km/h);
    // NOT authoritative route speed limits. Increase segment travel time if needed.
    let minSecondsForCaps=0;
    for(let j=1;j<profile.x.length;j++){
      const middleKm=a.km+(b.km-a.km)*(profile.x[j-1]+profile.x[j])/2;
      const cap=({urban:65,residential:75,rural:90})[zoneAt(train,middleKm)];
      const dx=(profile.x[j]-profile.x[j-1])*profile.distance;
      const share=(profile.w[j]-profile.w[j-1])/profile.total;
      minSecondsForCaps=Math.max(minSecondsForCaps,dx*3600/(share*cap));
    }
    movingSeconds=Math.max(movingSeconds,minSecondsForCaps);
    const pending=overrides.filter(e=>e.tripKey===key&&e.km>a.km&&e.km<=b.km).map(e=>Object.assign({},e));
    if(config.scenario==='incident'&&trainId===config.focusTrain&&a.km<totalKm*.52&&b.km>=totalKm*.52){
      pending.push({type:'signal',label:'Dừng chờ tín hiệu (kịch bản)',km:totalKm*.52,durationSec:28*60,tripKey:key,kind:'preset'});
    }
    pending.sort((x,y)=>x.km-y.km);
    let holdTotal=0;const holds=[];
    for(const ev of pending){
      const f=(ev.km-a.km)/(b.km-a.km),nominal=movingSeconds*timeFracAt(profile,f);
      const beginMs=cursor+(nominal+holdTotal)*1000,finishMs=beginMs+ev.durationSec*1000;
      holds.push({type:ev.type,label:ev.label,kind:ev.kind||'manual',routeKm:ev.km,beginMs,finishMs,durationSec:ev.durationSec});
      events.push({type:ev.type,label:ev.label,routeKm:ev.km,beginMs,finishMs,trainId,tripKey:key});
      holdTotal+=ev.durationSec;
    }
    const arrivalMs=cursor+(movingSeconds+holdTotal)*1000;
    const leg={i,from:a,to:b,scheduledFromMs:dayStart(departureDay)+a.minute*MIN,scheduledToMs:dayStart(departureDay)+b.minute*MIN,departMs:cursor,arrivalMs,movingSeconds,profile,holds};
    legs.push(leg);
    stationRows.push({name:d.byId[b.station].name,scheduledMs:leg.scheduledToMs,actualMs:arrivalMs,km:b.km,stationId:b.station});
    const hub=MAJOR.includes(d.byId[b.station].name);
    const dwellSec=i===stops.length-2?0:(hub?sc.dwell:12)*(.65+.7*rnd(key+'|dwell|'+i));
    cursor=arrivalMs+dwellSec*1000;
  }
  const trip={key,train,trainId,departureDay,startMs:initialMs,endMs:legs[legs.length-1].arrivalMs,legs,events,stationRows,totalKm};
  cached.set(cacheKey,trip);
  return trip;
 }
 function speedAt(leg,cell){
  const p=leg.profile,idx=clamp(cell,1,p.x.length-1);
  const deltaKm=(p.x[idx]-p.x[idx-1])*p.distance,dt=leg.movingSeconds*(p.w[idx]-p.w[idx-1])/p.total;
  return deltaKm*3600/(dt||1);
 }
 function forecastRows(trip,t){
  // Future incidents are hidden from the ETA estimator until they happen.
  // The generated actual timestamp remains available for after-action replay.
  let futureHoldMs=0;
  return trip.stationRows.map((row,i)=>{
   if(i>0){for(const hold of trip.legs[i-1].holds){if(hold.beginMs>t)futureHoldMs+=hold.durationSec*1000}}
   const forecastMs=row.actualMs-futureHoldMs;
   return Object.assign({},row,{forecastMs,forecastDeltaSec:Math.round((forecastMs-row.scheduledMs)/1000),observed:row.actualMs<=t});
  });
 }
 function telemetry(trip,t){
  if(!Number.isFinite(t))throw Error('Invalid timestamp');
  if(t<trip.startMs||t>=trip.endMs)return null;
  let leg=trip.legs.find(l=>t<l.arrivalMs);
  if(!leg)return null;
  const wasAtStation=t<leg.departMs;
  let status='RUNNING',activeEvent=null,routeKm=leg.from.km,speedKmh=0;
  if(wasAtStation){status='AT_STATION'}
  else{
    let elapsed=(t-leg.departMs)/1000,elapsedMoving=elapsed,isHolding=false;
    for(const hold of leg.holds){
      if(t>=hold.beginMs&&t<hold.finishMs){isHolding=true;activeEvent=hold;elapsedMoving=(hold.beginMs-leg.departMs)/1000-(leg.holds.filter(h=>h.finishMs<=hold.beginMs).reduce((x,h)=>x+h.durationSec,0));break;}
      if(t>=hold.finishMs)elapsedMoving-=hold.durationSec;
    }
    if(isHolding){status='INCIDENT';routeKm=activeEvent.routeKm}
    else{
      const at=fracAt(leg.profile,elapsedMoving/leg.movingSeconds);
      routeKm=leg.from.km+at.fraction*(leg.to.km-leg.from.km);
      speedKmh=speedAt(leg,at.cell);
      status=leg.to.km-routeKm<5?'APPROACHING':'RUNNING';
    }
  }
  const northKm=normNorth(trip.train,routeKm),pt=routePoint(northKm,d.stations);
  const zone=zoneAt(trip.train,routeKm);
  const forecast=forecastRows(trip,t);
  const etaMs=forecast[leg.i+1].forecastMs;
  const scheduledMs=leg.scheduledToMs;
  const delaySec=Math.round((etaMs-scheduledMs)/1000);
  const deltaLabel=delaySec>60?'Trễ '+Math.ceil(delaySec/60)+' phút':delaySec< -60?'Sớm '+Math.ceil(-delaySec/60)+' phút':'Đúng giờ (±1 phút)';
  const remainingKm=Math.max(0,leg.to.km-routeKm);
  const fromKm=Math.max(0,routeKm-leg.from.km);
  const phase=status==='AT_STATION'?'DWELL':status==='INCIDENT'?'STOPPED':remainingKm<=5?'BRAKING':fromKm<4?'ACCELERATING':'CRUISING';
  const zoneSpeedModelKmh=({urban:65,residential:75,rural:90})[zone];
  return{
    synthetic:true,source:'SYNTHETIC_SCHEDULE_MODEL',gpsSynthetic:true,positionQuality:'INTERPOLATED_STATION_REFERENCE',
    tripKey:trip.key,trainId:trip.trainId,departureDay:trip.departureDay,utcMs:t,isoTime:new Date(t).toISOString(),
    lat:+pt.lat.toFixed(6),lon:+pt.lon.toFixed(6),accuracyM:150,
    lineKm:+northKm.toFixed(4),routeKm:+routeKm.toFixed(4),speedKmh:+speedKmh.toFixed(2),direction:trip.train.direction,
    zone,zoneName:zoneVN(zone),zoneSpeedModelKmh,phase,status,activeEvent:activeEvent?{type:activeEvent.type,label:activeEvent.label,finishMs:activeEvent.finishMs}:null,
    previousStation:d.byId[leg.from.station].name,nextStation:d.byId[leg.to.station].name,
    plannedNextMs:scheduledMs,etaNextMs:etaMs,delaySec,deltaLabel,remainingKm:+remainingKm.toFixed(3),
    nextStationId:leg.to.station,etaFinalMs:forecast.at(-1).forecastMs,plannedFinalMs:trip.stationRows.at(-1).scheduledMs,
    waitRemainingSec:status==='INCIDENT'?Math.ceil((activeEvent.finishMs-t)/1000):status==='AT_STATION'?Math.ceil((leg.departMs-t)/1000):0
  };
 }
 function servicesAt(t,filter){
  const result=[],base=dayStart(dayKey(t));
  for(let off=-3;off<=0;off++){
    const date=dayKey(base+off*DAY);
    for(const tr of d.trains){if(filter&&filter!==tr.id)continue;const item=telemetry(build(tr.id,date),t);if(item)result.push(item)}
  }
  return result.sort((a,b)=>a.trainId.localeCompare(b.trainId)||a.departureDay.localeCompare(b.departureDay));
 }
 function inject({tripKey:key,km,type='signal',durationMin=12,label}){
  if(!/^[A-Z0-9]+\|\d{4}-\d\d-\d\d$/.test(String(key)))throw Error('Invalid trip key');
  const trainId=key.split('|')[0],trip=build(trainId,key.split('|')[1]);
  const leg=trip.legs.find(l=>km>l.from.km&&km<l.to.km);
  if(!leg)throw Error('Incident must be inside a moving segment');
  const item={tripKey:key,km,durationSec:Math.round(clamp(+durationMin,1,180)*60),type:String(type),label:String(label||'Phát sinh sự cố giả lập'),kind:'manual'};
  overrides.push(item);version++;cached.clear();return item;
 }
 function clearIncidents(){overrides=[];version++;cached.clear()}
 function setOptions(next){config=Object.assign({},config,next||{});version++;cached.clear()}
 function exportRecords({startMs,endMs,stepSec=60,trainId=null,maxRows=12000}){
  if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<startMs)throw Error('Invalid export interval');
  stepSec=clamp(Math.round(stepSec),1,3600);
  const out=[];
  for(let t=startMs;t<=endMs;t+=stepSec*1000){
    for(const rec of servicesAt(t,trainId)){out.push(rec);if(out.length>=maxRows)return out}
  }
  return out;
 }
 return{SCENARIOS,dayKey,dayStart,routePoint,zoneAt,getOptions:()=>Object.assign({},config),setOptions,trip:build,telemetry,forecastRows,servicesAt,inject,clearIncidents,exportRecords,getStations:()=>d.stations,getTrains:()=>d.trains,getManualIncidents:()=>overrides.slice(),getModeLabel:()=>scenario().name};
}
return{create,SCENARIOS,dayKey,dayStart,routePoint,zoneVN};
});
