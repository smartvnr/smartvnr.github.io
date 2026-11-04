/* VNR Scenario Lab CLI. Synthetic output only, never actual GPS or dispatch information. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),core=require('../simulator-core.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','rail-schedules.json'),'utf8'));
const o={train:null,date:null,start:null,scenario:'normal',seed:2026,minutes:60,step:10,format:'ndjson',incident:null,live:false,limit:20000};
const help=[
 'VNR Scenario Lab — sinh GPS/ETA GIẢ LẬP',
 'Usage: node scripts/generate-telemetry.cjs [options]',
 '--train SE1 --date 2026-11-04 --start 2026-11-04T21:45:00+07:00',
 '--scenario normal|urban|weather|incident|recovery --seed 2026',
 '--minutes 60 --step 10 --format ndjson|csv|json',
 '--incident 145:30    Chèn dừng 30 phút tại km 145 từ ga đi',
 '--live               Xuất NDJSON theo giờ thực, từng bước --step',
 '--limit 20000        Giới hạn số bản ghi',
 '--help',
 'Ví dụ: node scripts/generate-telemetry.cjs --train SE1 --date 2026-11-04 --step 1 --minutes 15 --format csv > gps.csv'
].join('\n')+'\n';
const argv=process.argv.slice(2);
for(let i=0;i<argv.length;i++){
 const key=argv[i].replace(/^--/,'');
 if(key==='help'){process.stdout.write(help);process.exit(0)}
 if(key==='live'){o.live=true;continue}
 if(!Object.hasOwn(o,key))throw Error('Unknown option '+key);
 o[key]=argv[++i];if(o[key]===undefined)throw Error('Missing argument for '+key);
}
for(const k of ['seed','minutes','step','limit'])o[k]=Number(o[k]);
if(!core.SCENARIOS[o.scenario])throw Error('Unknown scenario');
if(!Number.isInteger(o.seed)||o.seed<1||o.minutes<=0||o.minutes>43200||o.step<1||o.step>3600||o.limit<1||o.limit>1000000)throw Error('Invalid numeric parameters');
if(!['json','csv','ndjson'].includes(o.format)||o.live&&o.format!=='ndjson')throw Error('Invalid format for batch/live');
const engine=core.create(data,{scenario:o.scenario,seed:o.seed,focusTrain:o.train||'SE1'});
const trip=o.train&&o.date?engine.trip(o.train,o.date):null;
if(o.incident){
 if(!trip)throw Error('--incident requires --train and --date');
 const parts=o.incident.split(':').map(Number);
 if(parts.length!==2||parts.some(x=>!Number.isFinite(x)))throw Error('Expected --incident km:minutes');
 engine.inject({tripKey:trip.key,km:parts[0],durationMin:parts[1],type:'signal',label:'Sự cố giả lập qua CLI'});
}
const start=o.live?Date.now():o.start?Date.parse(o.start):trip?trip.startMs:Date.now();
if(!Number.isFinite(start))throw Error('Invalid start time');
const finish=start+o.minutes*60000;
const meta={type:'metadata',synthetic:true,source:'SYNTHETIC_SCHEDULE_MODEL',warning:'KHÔNG PHẢI GPS THẬT',options:o,sourceSchedule:data.sourceURL,startISO:new Date(start).toISOString()};
const rowAt=t=>trip?[engine.telemetry(engine.trip(o.train,o.date),t)].filter(Boolean):engine.servicesAt(t,o.train||null);
const emit=r=>process.stdout.write(JSON.stringify(r)+'\n');
const header=['isoTime','tripKey','trainId','departureDay','lat','lon','accuracyM','lineKm','routeKm','speedKmh','zone','zoneName','zoneSpeedModelKmh','phase','status','previousStation','nextStation','plannedNextMs','etaNextMs','delaySec','remainingKm','source','synthetic'];
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
if(o.live){
 emit(meta);
 let count=0;const cycle=()=>{
  if(Date.now()>finish||count>=o.limit){clearInterval(timer);return}
  for(const r of rowAt(Date.now())){emit(r);if(++count>=o.limit)break}
 };
 let timer=setInterval(cycle,o.step*1000);cycle();
}else{
 const records=[];
 for(let t=start;t<=finish;t+=o.step*1000){
  for(const r of rowAt(t)){records.push(r);if(records.length>=o.limit)break}
  if(records.length>=o.limit)break;
 }
 if(o.format==='json')process.stdout.write(JSON.stringify({metadata:{...meta,generated:records.length,truncated:records.length>=o.limit},records},null,2)+'\n');
 else if(o.format==='csv'){
  process.stdout.write('\uFEFF'+header.map(csvCell).join(',')+'\n');
  for(const r of records)process.stdout.write(header.map(k=>csvCell(r[k])).join(',')+'\n');
 }else{emit({...meta,generated:records.length,truncated:records.length>=o.limit});for(const r of records)emit(r)}
}