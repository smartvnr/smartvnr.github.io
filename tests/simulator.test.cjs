const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../simulator-core.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','rail-schedules.json'),'utf8'));
const day='2026-11-04';
const eng=(scenario='normal',seed=2026)=>core.create(data,{scenario,seed,focusTrain:'SE1'});
test('Public schedule dataset parses and contains ten named services',()=>{
 assert.equal(data.stations.length,38);assert.equal(data.trains.length,10);
 assert.deepEqual(data.trains.map(t=>t.id).sort(),['SE1','SE10','SE2','SE3','SE4','SE5','SE6','SE7','SE8','SE9'].sort());
 for(const tr of data.trains){
  assert.ok(tr.stops.length>=10,tr.id);
  for(let i=1;i<tr.stops.length;i++){
   assert.ok(tr.stops[i].minute>tr.stops[i-1].minute,tr.id+' minutes');
   assert.ok(tr.stops[i].km>tr.stops[i-1].km,tr.id+' kilometers');
  }
 }
});
test('Schedule dates use fixed Vietnam UTC+7 and carry over days',()=>{
 assert.equal(core.dayStart(day),Date.parse('2026-11-04T00:00:00+07:00'));
 const se1=eng().trip('SE1',day);
 assert.ok(se1.endMs>se1.startMs+86400000,'SE1 spans one day');
 const se9=eng().trip('SE9',day);
 assert.ok(se9.stationRows.at(-1).scheduledMs>core.dayStart(day)+86400000,'SE9 spans at least next day');
});
test('Engine deterministically reproduces a full trip for same seed and scenario',()=>{
 const a=eng('urban',42).trip('SE3',day),b=eng('urban',42).trip('SE3',day);
 assert.deepEqual(a.stationRows,b.stationRows);
 assert.equal(a.endMs,b.endMs);
 const c=eng('urban',43).trip('SE3',day);
 assert.notEqual(a.endMs,c.endMs);
});
test('All generated GPS references are synthetic, bounded, monotonically ordered',()=>{
 for(const tr of data.trains){
  const sim=eng(),trip=sim.trip(tr.id,day);
  let lastRouteKm=-Infinity,lastLineKm=tr.direction==='south'?-Infinity:Infinity;
  for(let i=0;i<60;i++){
   const t=trip.startMs+1000+(trip.endMs-trip.startMs-2000)*i/59;
   const r=sim.telemetry(trip,t);
   assert.ok(r, tr.id+' sample exists');
   assert.equal(r.synthetic,true);
   assert.equal(r.gpsSynthetic,true);
   assert.equal(r.source,'SYNTHETIC_SCHEDULE_MODEL');
   assert.equal(r.positionQuality,'INTERPOLATED_STATION_REFERENCE');
   assert.ok(r.lat>=10&&r.lat<=22&&r.lon>=105&&r.lon<=110, 'Vietnam bounds '+JSON.stringify(r));
   assert.ok(r.routeKm>=lastRouteKm-0.0001,'moving forward along trip');
   if(tr.direction==='south')assert.ok(r.lineKm>=lastLineKm-0.0001);
   else assert.ok(r.lineKm<=lastLineKm+0.0001);
   assert.ok(r.speedKmh>=0&&r.speedKmh<=90.05,'illustrative model peak <= 90');
   assert.ok(['urban','residential','rural'].includes(r.zone));
   assert.ok(['ACCELERATING','BRAKING','CRUISING','DWELL','STOPPED'].includes(r.phase));
   lastRouteKm=r.routeKm;lastLineKm=r.lineKm;
  }
 }
});
test('A signal event stops train in place, adds its exact dwell time to ETA and then releases it',()=>{
 const sim=eng(),before=sim.trip('SE1',day);
 const leg=before.legs[3],km=(leg.from.km+leg.to.km)/2;
 sim.inject({tripKey:before.key,km,type:'signal',durationMin:30,label:'Signal stop test'});
 const after=sim.trip('SE1',day),ev=after.events[0];
 assert.ok(ev&&ev.beginMs<ev.finishMs);
 assert.equal(Math.round((after.endMs-before.endMs)/1000),1800,'departure to final ETA changed 30 minutes');
 const t=ev.beginMs+40000,u=t+90000;
 const a=sim.telemetry(after,t),b=sim.telemetry(after,u);
 assert.equal(a.status,'INCIDENT');assert.equal(a.phase,'STOPPED');assert.equal(a.speedKmh,0);
 assert.equal(b.speedKmh,0);assert.equal(a.routeKm,b.routeKm);
 assert.equal(a.delaySec,Math.round((after.legs[3].arrivalMs-after.legs[3].scheduledToMs)/1000));
 const next=sim.telemetry(after,ev.finishMs+40000);
 assert.notEqual(next.status,'INCIDENT');
 assert.ok(next.speedKmh>0);
 sim.clearIncidents();assert.equal(sim.trip('SE1',day).events.length,0);
});
test('Incident preset creates event; urban and weather scenarios increase delay',()=>{
 const norm=eng('normal').trip('SE1',day);
 const urban=eng('urban').trip('SE1',day);
 const weather=eng('weather').trip('SE1',day);
 const incident=eng('incident').trip('SE1',day);
 assert.ok(urban.endMs>norm.endMs+30*60000);
 assert.ok(weather.endMs>urban.endMs);
 assert.ok(incident.events.length>=1);
 assert.ok(incident.endMs>norm.endMs+20*60000);
});
test('Station forecast compares plan with generated actual time',()=>{
 const sim=eng('weather'),trip=sim.trip('SE2',day),leg=trip.legs[8];
 const t=leg.departMs+20*1000,r=sim.telemetry(trip,t);
 assert.ok(r);
 assert.equal(r.plannedNextMs,leg.scheduledToMs);
 assert.equal(r.etaNextMs,leg.arrivalMs);
 assert.equal(r.delaySec,Math.round((leg.arrivalMs-leg.scheduledToMs)/1000));
 assert.ok(r.delaySec>0);
});
test('Batch generator can export rows every 10 seconds and enforces row count cap',()=>{
 const sim=eng(),trip=sim.trip('SE7',day);
 const rows=sim.exportRecords({startMs:trip.startMs+1000,endMs:trip.startMs+300000,stepSec:10,trainId:'SE7',maxRows:12});
 assert.equal(rows.length,12);assert.ok(rows.every(r=>r.synthetic&&r.trainId==='SE7'));
 assert.equal(rows[1].utcMs-rows[0].utcMs,10000);
});
test('UI includes all linked resources, DOM hook IDs, synthetic labels and export controls',()=>{
 const root=path.join(__dirname,'..');
 const h=fs.readFileSync(path.join(root,'simulator.html'),'utf8');
 const j=fs.readFileSync(path.join(root,'simulator-ui.js'),'utf8');
 const main=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(main.includes('href="./simulator.html"'),'linked from homepage');
 for(const file of ['./simulator-core.js','./simulator-ui.js','./simulator.css','./data/rail-schedules.json']){
  assert.ok(fs.existsSync(path.join(root,file)),file+' missing');
 }
 const hooks=[...j.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
 for(const id of new Set(hooks))assert.ok(h.includes('id="'+id+'"'),id+' DOM hook missing');
 assert.ok(j.includes('window.VNR_Sim'));
 assert.ok(j.includes('vnr-synthetic-telemetry'));
 assert.ok(h.includes('DỮ LIỆU GIẢ LẬP'));
 assert.ok(j.includes("window.VNRSIM.dayKey(start)"),'export filename uses core dayKey');
 for(const ext of ['json','ndjson','csv'])assert.ok(j.includes("downloadData('"+ext+"')"));
});
