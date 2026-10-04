import assert from 'node:assert/strict';
import {test} from 'node:test';
import {nextMatchRound,restoreMatchDeck,type MatchDeck} from '../lib/match-deck.ts';
import {spokenTerm,type Word} from '../lib/vocabulary.ts';
const words:Word[]=Array.from({length:11},(_,i)=>({id:String(i),term:'word'+i,meaning:'meaning'+i,synonyms:'',example:'',known:0}));
test('uses every word exactly once, including a single-word final round, before restarting',()=>{
 let deck:MatchDeck|undefined;const played:string[]=[];
 for(const size of [5,5,1]){deck=nextMatchRound(words,deck);assert.equal(deck.current.length,size);played.push(...deck.current);}
 assert.equal(new Set(played).size,11);
 assert.equal(nextMatchRound(words,deck).seen.length,5);
});
test('same term or meaning is separated into later rounds without losing words',()=>{
 const duplicates=[...words.slice(0,3),{...words[3],term:words[0].term},{...words[4],meaning:words[1].meaning}];
 let deck:MatchDeck|undefined;const played:string[]=[];
 while(played.length<duplicates.length){deck=nextMatchRound(duplicates,deck);const round=duplicates.filter(w=>deck!.current.includes(w.id));assert.equal(new Set(round.map(w=>w.term)).size,round.length);assert.equal(new Set(round.map(w=>w.meaning)).size,round.length);played.push(...deck.current);}
 assert.equal(new Set(played).size,duplicates.length);
});
test('reload retains current round, matched pairs, and remaining pool',()=>{
 const initial=nextMatchRound(words);initial.matched=[initial.current[0]];initial.attempts=2;
 const restored=restoreMatchDeck(words,JSON.parse(JSON.stringify(initial)));
 assert.deepEqual(restored,initial);
 const next=nextMatchRound(words,restored);assert.ok(next.current.every(id=>!initial.seen.includes(id)));
});
test('new words join the remaining pool and deleted words leave saved progress',()=>{
 const old=nextMatchRound(words.slice(0,5));
 const restored=restoreMatchDeck(words.filter(w=>w.id!==old.current[0]),old);
 assert.ok(!restored.seen.includes(old.current[0]));
 assert.ok(nextMatchRound(words,restored).current.some(id=>Number(id)>=5));
});
test('malformed storage is safe and independent scopes do not share progress',()=>{
 for(const value of [null,'bad',{current:[null,{},'missing'],seen:[1]}])assert.equal(restoreMatchDeck(words,value).current.length,5);
 const week=nextMatchRound(words.slice(0,3));const all=restoreMatchDeck(words,undefined);
 assert.equal(week.seen.length,3);assert.equal(all.seen.length,5);
});
test('speech omits single and combined part-of-speech labels',()=>{
 assert.equal(spokenTerm('wholesale (adj./n.)'),'wholesale');
 assert.equal(spokenTerm('resign (v.)'),'resign');
 assert.equal(spokenTerm('look after'),'look after');
});
