'use client';
import { useState } from 'react';
import { CalendarDays, BookOpen, CheckCircle2 } from 'lucide-react';
import { groupWeeks,weekKey,weekLabel } from '../lib/weeks';
import type { Word } from '../lib/vocabulary';
export default function WeekPicker({words,selected,onChange}:{words:Word[];selected:string;onChange:(s:string)=>void}){
 const [expanded,setExpanded]=useState(false);
 const groups=groupWeeks(words),thisWeek=weekKey(Date.now());
 const displayed=expanded?groups:groups.slice(0,5);
 return <section className="weekly-panel" aria-label="Từ vựng theo tuần">
  <div className="weekly-heading"><div><h2><CalendarDays size={21}/>Từ vựng theo tuần</h2><p>Thứ Hai – Chủ nhật · giờ Việt Nam. Chọn tuần để xem và học bộ từ tương ứng.</p></div><label className="week-select">Chọn tuần<select aria-label="Chọn tuần học" value={selected} onChange={e=>onChange(e.target.value)}><option value="all">Tất cả ({words.length} từ)</option>{groups.map(g=><option key={g.key} value={g.key}>{weekLabel(g.key)} · {g.count} từ</option>)}</select></label></div>
  <div className="week-cards"><button className={'week-card '+(selected==='all'?'chosen':'')} aria-pressed={selected==='all'} onClick={()=>onChange('all')}><span className="week-card-title"><BookOpen size={17}/>Tất cả các tuần</span><strong>{words.length} <small>từ vựng</small></strong><span className="week-subtitle">Toàn bộ hành trình học</span></button>{displayed.map(g=><button key={g.key} className={'week-card '+(selected===g.key?'chosen':'')} aria-pressed={selected===g.key} onClick={()=>onChange(g.key)}><span className="week-card-title">{g.key===thisWeek?'Tuần này':g.key==='undated'?'Từ chưa rõ ngày':'Tuần đã lưu'}</span><span className="week-range">{weekLabel(g.key)}</span><span className="week-card-bottom"><strong>{g.count} <small>từ</small></strong><span><CheckCircle2 size={14}/>{g.known} đã nhớ</span></span></button>)}</div>
  {groups.length>5&&<button className="text-button older-weeks" onClick={()=>setExpanded(v=>!v)}>{expanded?'Thu gọn':'Xem đủ '+groups.length+' tuần'}</button>}
 </section>;
}
