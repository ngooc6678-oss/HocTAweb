'use client';
import {useState} from 'react';
import {Sparkles} from 'lucide-react';

const messages=[
 ['Small steps, real progress.','Từng bước nhỏ làm nên tiến bộ thật sự.'],
 ['You do not have to be perfect to make progress.','Bạn không cần hoàn hảo để tiến bộ.'],
 ['Every word you practise is a step forward.','Mỗi từ bạn luyện tập là một bước tiến.'],
 ['Take your time. Keep going.','Cứ học theo nhịp của bạn. Tiếp tục nhé.'],
 ['Forgetting is a reason to practise, not to give up.','Quên là lý do để ôn lại, không phải để bỏ cuộc.'],
 ['A little practice today helps you tomorrow.','Một chút luyện tập hôm nay sẽ giúp bạn ngày mai.'],
];
export default function Motivation({step=0}:{step?:number}){
 const [offset,setOffset]=useState(0);
 const message=messages[(step+offset)%messages.length];
 return <aside className="motivation" aria-label="Một chút động lực"><Sparkles size={21} aria-hidden="true"/><div><p lang="en">{message[0]}</p><span lang="vi">{message[1]}</span></div><button className="text-button" onClick={()=>setOffset(n=>n+1)} aria-label="Xem câu động viên khác">Câu khác</button></aside>;
}
