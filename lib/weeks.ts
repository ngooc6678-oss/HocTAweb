import type { Word } from './vocabulary';
const DAY=86400000;
// Group by calendar weeks in Vietnam, irrespective of the browser's timezone.
export function weekKey(timestamp?:number):string {
 if(!Number.isFinite(timestamp)||!timestamp||timestamp<0)return 'undated';
 const d=new Date(timestamp+7*3600000);
 if(Number.isNaN(d.getTime()))return 'undated';
 const midnight=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
 return new Date(midnight-((d.getUTCDay()+6)%7)*DAY).toISOString().slice(0,10);
}
export function weekLabel(key:string):string {
 if(key==='all')return 'Tất cả các tuần';
 if(key==='undated')return 'Chưa có ngày thêm';
 const start=new Date(key+'T00:00:00Z'),end=new Date(start.getTime()+6*DAY);
 const format=(d:Date)=>new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(d);
 return format(start)+' – '+format(end);
}
export function groupWeeks(words:Word[]){
 const groups=new Map<string,{key:string;count:number;known:number}>();
 for(const w of words){const key=weekKey(w.createdAt);const g=groups.get(key)||{key,count:0,known:0};g.count++;if(w.known)g.known++;groups.set(key,g);}
 return [...groups.values()].sort((a,b)=>a.key==='undated'?1:b.key==='undated'?-1:b.key.localeCompare(a.key));
}
