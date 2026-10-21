import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('data/official',{recursive:true});
const titles = {
  newyear:['Tahun Baru Masehi',"New Year's Day"], isra:['Isra Mikraj Nabi Muhammad SAW',"Isra and Mi'raj"], imlek:['Tahun Baru Imlek','Chinese New Year'],
  nyepi:['Hari Suci Nyepi','Day of Silence (Nyepi)'], fitri:['Hari Raya Idulfitri','Eid al-Fitr'], friday:['Wafat Yesus Kristus','Good Friday'],
  easter:['Kebangkitan Yesus Kristus (Paskah)','Easter Sunday'], labour:['Hari Buruh Internasional','Labour Day'], ascension:['Kenaikan Yesus Kristus','Ascension Day'],
  adha:['Hari Raya Iduladha','Eid al-Adha'], waisak:['Hari Raya Waisak','Vesak Day'], pancasila:['Hari Lahir Pancasila','Pancasila Day'],
  islam:['Tahun Baru Islam','Islamic New Year'], independence:['Hari Proklamasi Kemerdekaan','Independence Day'], maulid:['Maulid Nabi Muhammad SAW',"Prophet Muhammad's Birthday"], christmas:['Kelahiran Yesus Kristus (Natal)','Christmas Day'],
};
const inputs = {
  2025: {
    sources:[{id:'skb-2025',title:'SKB 3 Menteri: libur nasional dan cuti bersama 2025',url:'https://www.kemenkopmk.go.id/index.php/pemerintah-tetapkan-hari-libur-nasional-dan-cuti-bersama-tahun-2025',published:'2024-10-15',decree:'1017/2024, 2/2024, 2/2024'}, {id:'skb-2025-amendment',title:'Perubahan SKB: tambahan cuti bersama 18 Agustus 2025',url:'https://setneg.go.id/baca/index/sambut_hut_ke_80_kemerdekaan_ri_pemerintah_tetapkan_18_agustus_2025_sebagai_cuti_bersama',published:'2025-08-07'}],
    national:'01-01:newyear 01-27:isra 01-29:imlek 03-29:nyepi 03-31:fitri 04-01:fitri 04-18:friday 04-20:easter 05-01:labour 05-12:waisak 05-29:ascension 06-01:pancasila 06-06:adha 06-27:islam 08-17:independence 09-05:maulid 12-25:christmas',
    leave:'01-28:imlek 03-28:nyepi 04-02:fitri 04-03:fitri 04-04:fitri 04-07:fitri 05-13:waisak 05-30:ascension 06-09:adha 08-18:independence 12-26:christmas',
  },
  2026: {
    sources:[{id:'skb-2026',title:'SKB 3 Menteri: 17 libur nasional dan 8 cuti bersama 2026',url:'https://www.kemenkopmk.go.id/pemerintah-tetapkan-17-hari-libur-nasional-dan-8-hari-cuti-bersama-tahun-2026',published:'2025-09-19',decree:'1497/2025, 2/2025, 5/2025'}],
    national:'01-01:newyear 01-16:isra 02-17:imlek 03-19:nyepi 03-21:fitri 03-22:fitri 04-03:friday 04-05:easter 05-01:labour 05-14:ascension 05-27:adha 05-31:waisak 06-01:pancasila 06-16:islam 08-17:independence 08-25:maulid 12-25:christmas',
    leave:'02-16:imlek 03-18:nyepi 03-20:fitri 03-23:fitri 03-24:fitri 05-15:ascension 05-28:adha 12-24:christmas',
  },
  2027: {
    sources:[{id:'skb-2027',title:'SKB 3 Menteri: 18 libur nasional dan 8 cuti bersama 2027',url:'https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027',published:'2026-09-15',decree:'1205/2026, 3/2026, 2/2026'}],
    national:'01-01:newyear 01-05:isra 02-06:imlek 03-08:nyepi 03-10:fitri 03-11:fitri 03-26:friday 03-28:easter 05-01:labour 05-06:ascension 05-17:adha 05-20:waisak 06-01:pancasila 06-06:islam 08-15:maulid 08-17:independence 12-25:christmas 12-26:isra',
    leave:'02-05:imlek 03-09:fitri 03-12:fitri 03-15:fitri 03-25:friday 05-18:adha 05-19:waisak 12-24:christmas',
  },
};
for (const [year,input] of Object.entries(inputs)) {
  const holidays = ['national','leave'].flatMap(type=>input[type].split(' ').map(row=>{
    const [date,key] = row.split(':'); const [name,nameEn]=titles[key];
    return {date:`${year}-${date}`,name,nameEn,type,status:'official',sourceId:year==='2025'&&date==='08-18'?'skb-2025-amendment':`skb-${year}`};
  })).sort((a,b)=>a.date.localeCompare(b.date));
  const data={year:Number(year),status:'official',updated:'2026-10-21',version:'2026.10.21',holidays,sources:input.sources.map(s=>({...s,checked:'2026-10-21'})),missing:[],note:{id:'Sesuai SKB dan perubahan yang dirujuk. Tanggal hari raya Islam mengikuti keputusan Menteri Agama. Cuti bersama swasta mengikuti kebijakan pemberi kerja.',en:'Based on the cited government decrees and amendments. Islamic observances remain subject to the Minister of Religious Affairs. Private-sector collective leave follows employer policy.'}};
  await writeFile(`data/official/${year}.json`,JSON.stringify(data,null,2)+'\n');
}
console.log('Seeded official 2025-2027; includes 18 August 2025 amendment.');
