import { getChatGPTUser } from '../../chatgpt-auth';
import { wordDb } from '../../../lib/word-db';
import { keyOf, type Draft } from '../../../lib/vocabulary';
import { validateBackup } from '../../../lib/backup';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Đăng nhập để lưu bộ từ của bạn.'},401);
 try {const rows=await wordDb().prepare('SELECT id,term,meaning,synonyms,example,known,created_at AS createdAt FROM words WHERE user_id = ? ORDER BY created_at, id').bind(user.userId).all();return json({words:rows.results});}
 catch(e){console.error('load words',e);return json({error:'Chưa tải được bộ từ. Vui lòng thử lại.'},503);}
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Đăng nhập để lưu bộ từ của bạn.'},401);
 if(req.headers.get('origin') && req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Yêu cầu không hợp lệ.'},403);
 let data:any;try{const raw=await req.text();if(raw.length>15000000)return json({error:'Dữ liệu quá lớn. Giới hạn 15 MB.'},413);data=JSON.parse(raw);if(!data||typeof data!=='object')throw new Error();}catch{return json({error:'Dữ liệu không hợp lệ.'},400);}
 try {
 const db=wordDb();
 if(data.action==='restore'){
  let backup;try{backup=validateBackup(data.backup);}catch(e){return json({error:(e as Error).message},400);}
  let added=0;
  try{for(let offset=0;offset<backup.length;offset+=100){
   const result=await db.batch(backup.slice(offset,offset+100).map(w=>db.prepare('INSERT INTO words (id,user_id,term,meaning,synonyms,example,word_key,known,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,word_key) DO NOTHING').bind(crypto.randomUUID(),user.userId,w.term,w.meaning,w.synonyms,w.example,keyOf(w),w.known,w.createdAt)));
   added+=result.reduce((n:number,r:any)=>n+(r.meta.changes||0),0);
  }}catch(e){console.error('restore words',e);return json({error:'Khôi phục chưa hoàn tất; một phần có thể đã được lưu. Bạn có thể chọn lại tệp để tiếp tục, các từ đã có sẽ được giữ nguyên.'},503);}
  return json({added,skipped:backup.length-added});
 }
 if(data.action==='import'){
  if(!Array.isArray(data.words)||!data.words.length||data.words.length>500)return json({error:'Mỗi lần nhập từ 1 đến 500 từ.'},400);
  const valid=data.words.every((w:any)=>w&&typeof w==='object'&&[['term',200],['meaning',2000],['synonyms',2000],['example',5000]].every(([k,n])=>typeof w[k]==='string'&&w[k].length<=Number(n))&&w.term.trim()&&w.meaning.trim());
  if(!valid)return json({error:'Cần có từ, nghĩa và nội dung đúng định dạng.'},400);
  const importedAt=Date.now(),batchId=crypto.randomUUID();
  const result=await db.batch(data.words.map((w:Draft,i:number)=>db.prepare('INSERT INTO words (id,user_id,term,meaning,synonyms,example,word_key,known,created_at) VALUES (?,?,?,?,?,?,?,0,?) ON CONFLICT(user_id,word_key) DO NOTHING').bind(batchId+'-'+String(i).padStart(3,'0'),user.userId,w.term.trim(),w.meaning.trim(),w.synonyms.trim(),w.example.trim(),keyOf(w),importedAt)));
  return json({added:result.reduce((n:number,r:any)=>n+(r.meta.changes||0),0)});
 }
 if(data.action==='known'&&typeof data.id==='string'&&typeof data.known==='boolean'){
  await db.prepare('UPDATE words SET known = ? WHERE id = ? AND user_id = ?').bind(data.known?1:0,data.id,user.userId).run();return json({ok:true});
 }
 if(data.action==='delete'&&typeof data.id==='string'){
  await db.prepare('DELETE FROM words WHERE id = ? AND user_id = ?').bind(data.id,user.userId).run();return json({ok:true});
 }
 return json({error:'Thao tác không hợp lệ.'},400);
 }catch(e){console.error('save words',e);return json({error:'Chưa lưu được thay đổi. Nội dung của bạn vẫn được giữ trên màn hình để thử lại.'},503);}
}
