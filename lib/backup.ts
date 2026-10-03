import type { Draft } from './vocabulary';
export type BackupWord = Draft & {known:number;createdAt:number};
export function validateBackup(input:unknown,now=Date.now()):BackupWord[]{
 if(!input||typeof input!=='object')throw new Error('Tệp sao lưu không hợp lệ.');
 const data=input as Record<string,unknown>;
 if(data.format!=='wordnest-backup'||data.version!==1||!Array.isArray(data.words))throw new Error('Hãy chọn tệp JSON được xuất từ Wordnest.');
 if(!data.words.length||data.words.length>5000)throw new Error('Tệp sao lưu cần chứa từ 1 đến 5.000 từ.');
 return data.words.map((raw:unknown,i:number)=>{
  if(!raw||typeof raw!=='object')throw new Error('Từ số '+(i+1)+' không hợp lệ.');
  const w=raw as Record<string,unknown>;
  const fields:[keyof Draft,number][]=[['term',200],['meaning',2000],['synonyms',2000],['example',5000]];
  for(const [k,max] of fields)if(typeof w[k]!=='string'||w[k].length>max||w[k].includes('\u0000'))throw new Error('Từ số '+(i+1)+' có nội dung thiếu hoặc quá dài.');
  if(!(w.term as string).trim()||!(w.meaning as string).trim()||(w.known!==0&&w.known!==1)||typeof w.createdAt!=='number'||!Number.isSafeInteger(w.createdAt)||w.createdAt<=0||w.createdAt>now+86400000)throw new Error('Từ số '+(i+1)+' có ngày thêm hoặc trạng thái không hợp lệ.');
  return {term:(w.term as string).trim(),meaning:(w.meaning as string).trim(),synonyms:(w.synonyms as string).trim(),example:(w.example as string).trim(),known:w.known,createdAt:w.createdAt};
 });
}
