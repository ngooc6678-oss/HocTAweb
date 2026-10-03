import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadAllWords,ApiError} from '../lib/words-client.ts';

test('loads a library beyond the database default 1000-row limit without dropping pages',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(input)=>{
  const page=Number(new URL(String(input),'https://wordnest.test').searchParams.get('cursor')||0);
  calls++;return Response.json({words:Array.from({length:100},(_,i)=>({id:String(page*100+i),term:'word'})),nextCursor:page<11?String(page+1):null});
 };
 try{const words=await loadAllWords();assert.equal(words.length,1200);assert.equal(words.at(-1)?.id,'1199');assert.equal(calls,12);}finally{globalThis.fetch=original;}
});
test('does not return a partial library if a later page fails or session expires',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>++calls===1?Response.json({words:[{id:'1'}],nextCursor:'next'}):Response.json({error:'Đăng nhập lại'},{status:401});
 try{await assert.rejects(loadAllWords(),e=>e instanceof ApiError&&e.status===401);}finally{globalThis.fetch=original;}
});
test('rejects a repeated cursor instead of looping indefinitely',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({words:[{id:'1'}],nextCursor:'repeat'});
 try{await assert.rejects(loadAllWords(),/đầy đủ/);}finally{globalThis.fetch=original;}
});
