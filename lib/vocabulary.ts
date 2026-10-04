export type Word = { id: string; term: string; meaning: string; synonyms: string; example: string; known: number; createdAt?: number };
export type Draft = Pick<Word, 'term' | 'meaning' | 'synonyms' | 'example'>;
export const SAMPLE: Word[] = [
 {id:'demo-1',term:'patrons (n.)',meaning:'khách hàng, khách quen; người bảo trợ',synonyms:'customers, clients, supporters',example:'The restaurant offers special discounts to its regular patrons. (Nhà hàng giảm giá đặc biệt cho khách quen.)',known:0},
 {id:'demo-2',term:'eject (v.)',meaning:'đẩy ra, đuổi ra',synonyms:'expel, remove, force out',example:'The security guard ejected the man from the building. (Nhân viên bảo vệ đã đuổi người đàn ông khỏi tòa nhà.)',known:0},
 {id:'demo-3',term:'abandon (v.)',meaning:'từ bỏ, bỏ rơi',synonyms:'leave, give up, desert',example:'They decided to abandon the project. (Họ quyết định từ bỏ dự án.)',known:0},
 {id:'demo-4',term:'resign (v.)',meaning:'từ chức, nghỉ việc',synonyms:'quit, step down, leave',example:'She decided to resign from her position. (Cô ấy quyết định từ chức khỏi vị trí của mình.)',known:0},
 {id:'demo-5',term:'discourage (v.)',meaning:'làm nản lòng, ngăn cản',synonyms:'dishearten, deter, dissuade',example:'The high cost may discourage customers from buying the product. (Chi phí cao có thể khiến khách hàng không muốn mua sản phẩm.)',known:0},
];
export function cleanCell(value: string) {
 return value.replace(/<br\s*\/?\s*>/gi,' ').replace(/&nbsp;|&#xA0;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*\*|__|`/g,'').replace(/\*/g,'').replace(/\\\|/g,'|').replace(/[\u00a0\u200b\uFEFF]/g,' ').replace(/\s+/g,' ').trim().normalize('NFC');
}
const fold = (s:string)=>cleanCell(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
function column(s:string):number { const v=fold(s); if (/synonym|dong nghia/.test(v)) return 2; if (/example|vi du/.test(v)) return 3; if (/meaning|nghia|translation/.test(v)) return 1; if (/^(tu|word|term|vocabulary|english)/.test(v)) return 0; return -1; }
function splitMarkdown(s:string) {
 const a:string[]=[]; let cell='',escaped=false,code=false;
 for(const c of s.trim()) { if(escaped){cell+='\\'+c;escaped=false;continue;} if(c==='\\'){escaped=true;continue;} if(c==='`')code=!code; if(c==='|'&&!code){a.push(cell);cell='';}else cell+=c; }
 if(escaped)cell+='\\'; a.push(cell);
 if(s.trim().startsWith('|'))a.shift(); if(a[a.length-1]==='' && s.trim().endsWith('|'))a.pop(); return a;
}
export function parseRows(rows: string[][]) {
 const words:Draft[]=[], issues:string[]=[]; let order=[0,1,2,3], numbered=false;
 rows.forEach((raw,idx)=>{
  let cells=raw.map(cleanCell); if(cells.every(c=>!c))return;
  if(cells.every(c=>/^:?-{2,}:?$/.test(c.replace(/\s/g,''))))return;
  if(cells.length===5 && /^(stt|#|no\.?|number)$/i.test(cells[0]) && [0,1,2,3].every(n=>cells.slice(1).map(column).includes(n))) { numbered=true;cells=cells.slice(1); }
  else if(numbered && cells.length===5 && /^\d+[.)]?$/.test(cells[0]))cells=cells.slice(1);
  const mapped=cells.map(column);
  if(cells.length===4 && [0,1,2,3].every(n=>mapped.includes(n))){order=[0,1,2,3].map(n=>mapped.indexOf(n));return;}
  if(cells.length!==4){issues.push(`Dòng ${idx+1}: có ${cells.length} cột, cần đủ 4 cột.`);return;}
  const [term,meaning,synonyms,example]=order.map(i=>cells[i]);
  if(!term||!meaning){issues.push(`Dòng ${idx+1}: thiếu từ hoặc nghĩa.`);return;}
  if(term.length>200||meaning.length>2000||synonyms.length>2000||example.length>5000){issues.push(`Dòng ${idx+1}: nội dung quá dài.`);return;}
  words.push({term,meaning,synonyms,example});
 });
 return {words,issues};
}
export function parseText(text:string) {
 const lines=text.replace(/\r\n?/g,'\n').split('\n').filter(l=>l.trim());
 const rows=lines.filter(l=>l.includes('|')||l.includes('\t')).map(l=>l.includes('\t')?l.split('\t'):splitMarkdown(l));
 if(!rows.length)return {words:[],issues:['Chưa nhận ra bảng. Hãy sao chép bảng đủ 4 cột hoặc dùng mẫu bên dưới.']};
 return parseRows(rows);
}
export function keyOf(w:Draft) { return [w.term,w.meaning].map(s=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()).join('\u001f'); }
export function posLabel(s:string){return s.match(/\((?:n|v|adj|adv|prep|pron|conj|det|interj|phrasal v|phr|noun|verb|adjective|adverb)\.?(?:\s*[/,]\s*(?:n|v|adj|adv|prep|pron|conj|det|interj|phrasal v|phr|noun|verb|adjective|adverb)\.?)*\)\s*$/i)?.[0]||'';}
export function spokenTerm(s:string){const p=posLabel(s);return p?s.slice(0,s.lastIndexOf(p)).trim():s.trim();}
