import Holidays from 'date-holidays';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { civil, type YearData, type Holiday } from '../src/core.ts';

export async function loadYears(): Promise<Map<number,YearData>> {
  const official=new Map<number,YearData>();
  for (const file of await readdir('data/official')) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(await readFile(`data/official/${file}`,'utf8')) as YearData;
    validate(data); official.set(data.year,data);
  }
  const id=new Holidays('ID',{languages:['id'],timezone:'Asia/Jakarta',types:['public']});
  const en=new Holidays('ID',{languages:['en'],timezone:'Asia/Jakarta',types:['public']});
  const result = new Map<number,YearData>();
  for (let year=1900;year<=2100;year++) {
    if (official.has(year)) { result.set(year,official.get(year)!); continue; }
    // No retrospective legal claims: historical holidays require archival evidence.
    const historical=year < Math.min(...official.keys());
    const english=en.getHolidays(year);
    const holidays:Holiday[]=historical?[]:id.getHolidays(year).filter(h=>h.type==='public').map(h=>({
      date:h.date.slice(0,10),name:h.name,nameEn:english.find(e=>e.date===h.date&&e.rule===h.rule)?.name??h.name,
      type:'national',status:'estimated',sourceId:'date-holidays',
    }));
    const data:YearData={year,status:historical?'unverified':'estimated',updated:'2026-10-21',version:'2026.10.21',holidays,
      sources:historical?[]:[{id:'date-holidays',title:'date-holidays: Indonesian calculation rules (not a government decree)',url:'https://github.com/commenthol/date-holidays/blob/master/data/countries/ID.yaml',published:'2026-10-21',checked:'2026-10-21'}],
      missing:historical?['national-holiday-archive','collective-leave-archive']:['official-decree','collective-leave','nyepi','vesak'],
      note:historical?{id:'Kalender Masehi tersedia. Arsip hari libur dan cuti bersama tahun ini belum diverifikasi; daftar kosong bukan berarti tidak ada libur.',en:'Gregorian calendar is available. Holiday and collective-leave archives for this year have not been verified; an empty list does not mean no holidays.'}:{id:'Perkiraan sebagian hari libur, bukan SKB. Nyepi, Waisak, cuti bersama, dan penetapan hari raya Islam menunggu sumber resmi.',en:'Partial holiday estimates, not a government decree. Nyepi, Vesak, collective leave and Indonesian Islamic observances await official sources.'},
    };
    // Add Easter explicitly, absent in upstream ID rules. It remains an estimate.
    if (!historical) {
      const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;
      const date=`${year}-${String(Math.floor(n/31)).padStart(2,'0')}-${String(n%31+1).padStart(2,'0')}`;
      if (!holidays.some(x=>x.date===date&&/paskah|easter/i.test(x.name))) holidays.push({date,name:'Kebangkitan Yesus Kristus (Paskah)',nameEn:'Easter Sunday',type:'national',status:'estimated',sourceId:'date-holidays'});
    }
    data.holidays.sort((a,b)=>a.date.localeCompare(b.date)); validate(data); result.set(year,data);
  }
  return result;
}
export function validate(data:YearData) {
  if (!Number.isInteger(data.year)||data.year<1900||data.year>2100) throw Error('Invalid year');
  if (!['official','estimated','unverified'].includes(data.status)) throw Error('Invalid status');
  const seen=new Set<string>();
  for (const h of data.holidays) {
    civil(h.date); if (!h.date.startsWith(`${data.year}-`)) throw Error(`Wrong event year: ${h.date}`);
    const key=`${h.date}:${h.type}:${h.name}`; if (seen.has(key)) throw Error(`Duplicate: ${key}`); seen.add(key);
    if (!['national','leave'].includes(h.type)||!['official','estimated','unverified'].includes(h.status)) throw Error(`Invalid event enum: ${key}`);
    if (!h.name||!h.nameEn||!data.sources.some(s=>s.id===h.sourceId)) throw Error(`Missing provenance: ${key}`);
    if (h.status==='official' && !data.sources.some(s=>s.id===h.sourceId && new URL(s.url).hostname.endsWith('.go.id'))) throw Error(`Official event needs government source: ${key}`);
  }
  for (const s of data.sources) { if (new URL(s.url).protocol!=='https:') throw Error('Source must use HTTPS'); }
}
export function dataHash(data:YearData): string { return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0,16); }
