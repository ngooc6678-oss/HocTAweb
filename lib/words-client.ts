import type {Word} from './vocabulary';
export class ApiError extends Error {status:number;constructor(message:string,status:number){super(message);this.status=status;}}
export async function loadAllWords():Promise<Word[]>{
 const all=new Map<string,Word>();let cursor:string|null=null;const seen=new Set<string>();
 do{const url='/api/words'+(cursor?'?cursor='+encodeURIComponent(cursor):'');const res=await fetch(url,{cache:'no-store'});let out:any;try{out=await res.json();}catch{throw new ApiError('Chưa tải được bộ từ. Hãy thử lại.',res.status);}
 if(!res.ok)throw new ApiError(out.error||'Chưa tải được bộ từ.',res.status);
 if(!Array.isArray(out.words))throw new Error('Phản hồi bộ từ không hợp lệ.');for(const word of out.words)all.set(word.id,word);
 cursor=out.nextCursor||null;if(cursor&&seen.has(cursor))throw new Error('Chưa tải đầy đủ bộ từ. Hãy thử lại.');if(cursor)seen.add(cursor);
 }while(cursor);return [...all.values()];
}
