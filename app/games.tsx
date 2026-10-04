'use client';
import {useEffect,useState} from 'react';
import {nextMatchRound,restoreMatchDeck,shuffle,type MatchDeck} from '../lib/match-deck';
import {CheckCircle2, Volume2, RotateCcw} from 'lucide-react';
import {spokenTerm,type Word} from '../lib/vocabulary';
function mix<T>(a:T[]){const v=[...a];for(let i=v.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[v[i],v[j]]=[v[j],v[i]];}return v;}
export default function Games({words,mode,speak,storageKey}:{words:Word[];mode:'quiz'|'match';speak:(s:string)=>void;storageKey:string}){
 const [round,setRound]=useState(0);
 const unique=words.filter((w,i)=>words.findIndex(x=>x.meaning.trim().toLowerCase()===w.meaning.trim().toLowerCase())===i);
 if(mode==='match')return <Match words={words} speak={speak} storageKey={storageKey}/>;
 if(unique.length<2)return <div className="empty"><h2>Thêm ít nhất 2 từ có nghĩa khác nhau</h2><p>Trò chơi cần nhiều đáp án để bạn lựa chọn. Bạn vẫn có thể ôn bộ hiện tại bằng thẻ ghi nhớ.</p></div>;
 return <Quiz key={'q'+round} words={unique} speak={speak} restart={()=>setRound(v=>v+1)}/>;
}
function Quiz({words,speak,restart}:{words:Word[];speak:(s:string)=>void;restart:()=>void}){
 const [questions]=useState(()=>mix(words).slice(0,10).map(w=>({word:w,options:mix([w,...mix(words.filter(x=>x.id!==w.id)).slice(0,3)])})));
 const [idx,setIdx]=useState(0),[choice,setChoice]=useState<string|null>(null),[score,setScore]=useState(0);
 if(idx>=questions.length)return <div className="session-done"><CheckCircle2 size={52}/><h2>Bạn đã hoàn thành lượt chơi!</h2><div className="result-score">{score}<span> / {questions.length}</span></div><p>{score===questions.length?'Nhớ rất tốt! Thử thêm những từ mới nhé.':'Hãy ôn lại những từ chưa chắc rồi thử một lần nữa.'}</p><button className="primary" onClick={restart}><RotateCcw size={18}/>Chơi lại</button></div>;
 const q=questions[idx];
 return <div className="study"><div className="study-top"><span>CÂU {idx+1} / {questions.length}</span><span>{score} câu đúng</span></div><div className="flash-card quiz-card"><span className="card-kicker">CHỌN NGHĨA ĐÚNG</span><h2 className="flash-word" lang="en">{spokenTerm(q.word.term)}</h2><button className="sound large" aria-label="Nghe từ trong câu hỏi" onClick={()=>speak(spokenTerm(q.word.term))}><Volume2 size={22}/></button></div><div className="quiz-options">{q.options.map((o,i)=><button key={o.id} disabled={choice!==null} className={'quiz-option '+(choice?(o.id===q.word.id?'correct':o.id===choice?'incorrect':''):'')} onClick={()=>{setChoice(o.id);if(o.id===q.word.id)setScore(v=>v+1);}}><span>{'ABCD'[i]}</span>{o.meaning}{choice&&o.id===q.word.id&&<CheckCircle2 size={20}/>}</button>)}</div>{choice&&<div className="game-feedback" role="status"><strong>{choice===q.word.id?'Chính xác!':'Chưa đúng. Hãy ghi nhớ đáp án màu xanh nhé.'}</strong><p lang="en">{q.word.example}</p><button className="primary" onClick={()=>{setChoice(null);setIdx(v=>v+1);}}>{idx+1===questions.length?'Xem kết quả':'Câu tiếp theo'}</button></div>}<p className="study-hint">Điểm của lượt chơi không tự đổi trạng thái “Đã nhớ”.</p></div>;
}
function Match({words,speak,storageKey}:{words:Word[];speak:(s:string)=>void;storageKey:string}){
 const [deck,setDeck]=useState<MatchDeck|null>(null),[storageWarning,setStorageWarning]=useState(false);
 useEffect(()=>{
  let saved:unknown;
  try{const raw=localStorage.getItem(storageKey);saved=raw?JSON.parse(raw):undefined;}catch{setStorageWarning(true);}
  setDeck(restoreMatchDeck(words,saved));
 // The parent remounts this component when the account, scope or word IDs change.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[storageKey]);
 useEffect(()=>{if(deck)try{localStorage.setItem(storageKey,JSON.stringify(deck));}catch{setStorageWarning(true);}},[deck,storageKey]);
 if(!words.length)return <div className="empty">Chưa có từ trong bộ này.</div>;
 if(!deck)return <div className="empty">Đang chuẩn bị lượt ghép cặp…</div>;
 const remaining=words.length-deck.seen.length;
 return <><MatchRound key={deck.current.join('|')} words={words} deck={deck} remaining={remaining} speak={speak} update={setDeck} restart={()=>setDeck(nextMatchRound(words,deck))}/><p className="study-hint">{storageWarning?'Trình duyệt không lưu được tiến độ ghép cặp; tiến độ chỉ giữ khi trang còn mở.':'Tiến độ ghép cặp được giữ trên trình duyệt này, riêng cho từng tuần và toàn bộ từ.'}</p></>;
}
function MatchRound({words,deck,remaining,speak,update,restart}:{words:Word[];deck:MatchDeck;remaining:number;speak:(s:string)=>void;update:(d:MatchDeck)=>void;restart:()=>void}){
 const pairs=deck.current.map(id=>words.find(w=>w.id===id)!);
 const [right]=useState(()=>shuffle(pairs)),[leftChoice,setLeft]=useState<string|null>(null),[rightChoice,setRight]=useState<string|null>(null),[feedback,setFeedback]=useState(''),[wrong,setWrong]=useState(false);
 const {matched,attempts}=deck;
 function choose(side:'left'|'right',id:string){
  const l=side==='left'?id:leftChoice,r=side==='right'?id:rightChoice;
  setWrong(false);if(side==='left')setLeft(id);else setRight(id);
  if(l&&r){const correct=l===r;update({...deck,attempts:attempts+1,matched:correct?[...matched,l]:matched});if(correct){setLeft(null);setRight(null);setFeedback('Đúng rồi! Bạn đã ghép thêm một cặp.');}else{setWrong(true);setFeedback('Chưa khớp. Chọn lại một từ hoặc nghĩa.');}}
 }
 if(matched.length===pairs.length)return <div className="session-done"><CheckCircle2 size={52}/><h2>{remaining?'Đã ghép đủ '+pairs.length+' cặp!':'Đã hoàn thành bộ từ đang chọn!'}</h2><p>Bạn hoàn thành lượt này trong {attempts} lần ghép.</p><p>{remaining?'Còn '+remaining+' từ chưa chơi. Lượt tiếp theo sẽ dùng từ mới.':'Bạn đã đi hết bộ từ. Bắt đầu vòng mới để ôn lại từ đầu.'}</p><button className="primary" onClick={restart}><RotateCcw size={18}/>{remaining?'Chơi lượt tiếp theo':'Bắt đầu vòng mới'}</button></div>;
 return <div className="study"><div className="study-top"><span>ĐÃ GHÉP {matched.length} / {pairs.length} CẶP</span><span>Còn {remaining} từ sau lượt này</span></div><div className="match-grid">{[pairs,right].map((col,ci)=><div key={ci} className="match-column"><h3>{ci===0?'TIẾNG ANH · NHẤN ĐỂ NGHE':'NGHĨA TIẾNG VIỆT'}</h3>{col.map(w=><button lang={ci===0?'en':'vi'} key={w.id} disabled={ci===1&&matched.includes(w.id)} aria-pressed={ci===0?leftChoice===w.id:rightChoice===w.id} className={'match-tile '+(matched.includes(w.id)?'matched':(ci===0?leftChoice===w.id:rightChoice===w.id)?(wrong?'wrong':'chosen'):'')} onClick={()=>{if(ci===0)speak(spokenTerm(w.term));if(!matched.includes(w.id))choose(ci===0?'left':'right',w.id);}}>{ci===0?spokenTerm(w.term):w.meaning}{ci===0&&<Volume2 size={16} aria-hidden="true"/>}{matched.includes(w.id)&&<CheckCircle2 size={18}/>}</button>)}</div>)}</div><p className={'match-feedback '+(wrong?'wrong-text':'')} role="status">{feedback||'Nhấn từ tiếng Anh để nghe, rồi chọn nghĩa tương ứng.'}</p><p className="study-hint">Mỗi lượt tối đa 5 cặp · Ghép hết lượt này để sang các từ chưa chơi</p></div>;
}
