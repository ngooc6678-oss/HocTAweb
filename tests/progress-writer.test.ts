import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProgressWriter} from '../lib/progress-writer.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve!:()=>void,reject!:(e:Error)=>void;const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
test('slow saves do not block another card and pending stays accurate',async()=>{
 const a=deferred(),b=deferred();const calls:string[]=[];let state={pending:0,failed:0};
 const writer=createProgressWriter(async id=>{calls.push(id);await(id==='a'?a:b).promise;},s=>state=s);
 writer.save('a',true);writer.save('b',false);
 assert.deepEqual(calls,['a','b']);assert.equal(state.pending,2);
 a.resolve();await tick();assert.equal(state.pending,1);
 b.resolve();await tick();assert.deepEqual(state,{pending:0,failed:0});
});
test('rapid changes on the same word preserve the latest choice on the server',async()=>{
 const gate=deferred();const calls:boolean[]=[];
 const writer=createProgressWriter(async(_id,value)=>{calls.push(value);if(calls.length===1)await gate.promise;},()=>{});
 writer.save('a',true);writer.save('a',false);assert.deepEqual(calls,[true]);
 gate.resolve();await tick();assert.deepEqual(calls,[true,false]);
});
test('failed saves remain visible and retry the selected value',async()=>{
 let fail=true;let state={pending:0,failed:0};const calls:boolean[]=[];
 const writer=createProgressWriter(async(_id,value)=>{calls.push(value);if(fail)throw Error('offline');},s=>state=s);
 writer.save('a',false);await tick();assert.deepEqual(state,{pending:0,failed:1});
 fail=false;writer.retry();await tick();assert.deepEqual(calls,[false,false]);assert.deepEqual(state,{pending:0,failed:0});
});
test('an older failed request cannot undo a newer choice',async()=>{
 const gate=deferred();const calls:boolean[]=[];let state={pending:0,failed:0};
 const writer=createProgressWriter(async(_id,value)=>{calls.push(value);if(calls.length===1)await gate.promise;},s=>state=s);
 writer.save('a',true);writer.save('a',false);gate.reject(Error('offline'));await tick();
 assert.deepEqual(calls,[true,false]);assert.deepEqual(state,{pending:0,failed:0});
});
