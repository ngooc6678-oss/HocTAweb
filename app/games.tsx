'use client';
import {useState} from 'react';
import {CheckCircle2, Volume2, RotateCcw} from 'lucide-react';
import {spokenTerm,type Word} from '../lib/vocabulary';
function mix<T>(a:T[]){const v=[...a];for(let i=v.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[v[i],v[j]]=[v[j],v[i]];}return v;}
export default function Games({words,mode,speak}:{words:Word[];mode:'quiz'|'match';speak:(s:string)=>void}){
 const [round,setRound]=useState(0);
 const unique=words.filter((w,i)=>words.findIndex(x=>x.meaning.trim().toLowerCase()===w.meaning.trim().toLowerCase())===i);
 if(unique.length<2)return <div className="empty"><h2>Thêm ít nhất 2 từ có nghĩa khác nhau</h2><p>Trò chơi cần nhiều đáp án để bạn lựa chọn. Bạn vẫn có thể ôn bộ hiện tại bằng thẻ ghi nhớ.</p></div>;
 return mode==='quiz'?<Quiz key={'q'+round} words={unique} speak={speak} restart={()=>setRound(v=>v+1)}/>:<Match key={'m'+round} words={unique} restart={()=>setRound(v=>v+1)}/>;
}
function Quiz({words,speak,restart}:{words:Word[];speak:(s:string)=>void;restart:()=>void}){
 const [questions]=useState(()=>mix(words).slice(0,10).map(w=>({word:w,options:mix([w,...mix(words.filter(x=>x.id!==w.id)).slice(0,3)])})));
 const [idx,setIdx]=useState(0),[choice,setChoice]=useState<string|null>(null),[score,setScore]=useState(0);
 if(idx>=questions.length)return <div className="session-done"><CheckCircle2 size={52}/><h2>Bạn đã hoàn thành lượt chơi!</h2><div className="result-score">{score}<span> / {questions.length}</span></div><p>{score===questions.length?'Nhớ rất tốt! Thử thêm những từ mới nhé.':'Hãy ôn lại những từ chưa chắc rồi thử một lần nữa.'}</p><button className="primary" onClick={restart}><RotateCcw size={18}/>Chơi lại</button></div>;
 const q=questions[idx];
 return <div className="study"><div className="study-top"><span>CÂU {idx+1} / {questions.length}</span><span>{score} câu đúng</span></div><div className="flash-card quiz-card"><span className="card-kicker">CHỌN NGHĨA ĐÚNG</span><h2 className="flash-word" lang="en">{spokenTerm(q.word.term)}</h2><button className="sound large" aria-label="Nghe từ trong câu hỏi" onClick={()=>speak(spokenTerm(q.word.term))}><Volume2 size={22}/></button></div><div className="quiz-options">{q.options.map((o,i)=><button key={o.id} disabled={choice!==null} className={'quiz-option '+(choice?(o.id===q.word.id?'correct':o.id===choice?'incorrect':''):'')} onClick={()=>{setChoice(o.id);if(o.id===q.word.id)setScore(v=>v+1);}}><span>{'ABCD'[i]}</span>{o.meaning}{choice&&o.id===q.word.id&&<CheckCircle2 size={20}/>}</button>)}</div>{choice&&<div className="game-feedback" role="status"><strong>{choice===q.word.id?'Chính xác!':'Chưa đúng. Hãy ghi nhớ đáp án màu xanh nhé.'}</strong><p lang="en">{q.word.example}</p><button className="primary" onClick={()=>{setChoice(null);setIdx(v=>v+1);}}>{idx+1===questions.length?'Xem kết quả':'Câu tiếp theo'}</button></div>}<p className="study-hint">Điểm của lượt chơi không tự đổi trạng thái “Đã nhớ”.</p></div>;
}
function Match({words,restart}:{words:Word[];restart:()=>void}){
 // Identical English terms with different meanings would otherwise be ambiguous.
 const [pairs]=useState(()=>mix(words.filter((w,i)=>words.findIndex(x=>spokenTerm(x.term).toLowerCase()===spokenTerm(w.term).toLowerCase())===i)).slice(0,5));
 const [right]=useState(()=>mix(pairs)),[leftChoice,setLeft]=useState<string|null>(null),[rightChoice,setRight]=useState<string|null>(null),[matched,setMatched]=useState<string[]>([]),[attempts,setAttempts]=useState(0),[feedback,setFeedback]=useState(''),[wrong,setWrong]=useState(false);
 function choose(side:'left'|'right',id:string){
  const l=side==='left'?id:leftChoice,r=side==='right'?id:rightChoice;
  setWrong(false);if(side==='left')setLeft(id);else setRight(id);
  if(l&&r){setAttempts(n=>n+1);if(l===r){setMatched(a=>[...a,l]);setLeft(null);setRight(null);setFeedback('Đúng rồi! Bạn đã ghép thêm một cặp.');}else{setWrong(true);setFeedback('Chưa khớp. Chọn lại một từ hoặc nghĩa.');}}
 }
 if(pairs.length<2)return <div className="empty">Cần ít nhất 2 từ có cách viết và nghĩa khác nhau để ghép cặp.</div>;
 if(matched.length===pairs.length)return <div className="session-done"><CheckCircle2 size={52}/><h2>Đã ghép đủ {pairs.length} cặp!</h2><p>Bạn hoàn thành trong {attempts} lần ghép.</p><button className="primary" onClick={restart}><RotateCcw size={18}/>Chơi lượt mới</button></div>;
 return <div className="study"><div className="study-top"><span>ĐÃ GHÉP {matched.length} / {pairs.length} CẶP</span><button className="secondary" onClick={restart}><RotateCcw size={16}/>Lượt mới</button></div><div className="match-grid">{[pairs,right].map((col,ci)=><div key={ci} className="match-column"><h3>{ci===0?'TIẾNG ANH':'NGHĨA TIẾNG VIỆT'}</h3>{col.map(w=><button lang={ci===0?'en':'vi'} key={w.id} disabled={matched.includes(w.id)} aria-pressed={ci===0?leftChoice===w.id:rightChoice===w.id} className={'match-tile '+(matched.includes(w.id)?'matched':(ci===0?leftChoice===w.id:rightChoice===w.id)?(wrong?'wrong':'chosen'):'')} onClick={()=>choose(ci===0?'left':'right',w.id)}>{ci===0?spokenTerm(w.term):w.meaning}{matched.includes(w.id)&&<CheckCircle2 size={18}/>}</button>)}</div>)}</div><p className={'match-feedback '+(wrong?'wrong-text':'')} role="status">{feedback||'Chọn một ô ở mỗi bên để ghép cặp.'}</p><p className="study-hint">Mỗi lượt tối đa 5 cặp · Không giới hạn thời gian</p></div>;
}
