export type SaveState = {pending: number; failed: number};

// Different words save concurrently; updates to the same word keep their order.
export function createProgressWriter(send:(id:string,known:boolean)=>Promise<unknown>, changed:(state:SaveState)=>void) {
 const entries=new Map<string,{known:boolean;version:number;running:boolean}>();
 function report(){changed({pending:[...entries.values()].filter(e=>e.running).length,failed:[...entries.values()].filter(e=>!e.running).length});}
 async function drain(id:string){
  const entry=entries.get(id)!;entry.running=true;report();
  while(true){
   const version=entry.version,known=entry.known;
   try{await send(id,known);}catch{
    if(version!==entry.version)continue;
    entry.running=false;report();return;
   }
   if(version!==entry.version)continue;
   entries.delete(id);report();return;
  }
 }
 return {
  save(id:string,known:boolean){
   const entry=entries.get(id);
   if(entry){entry.known=known;entry.version++;if(!entry.running)void drain(id);}
   else{entries.set(id,{known,version:0,running:false});void drain(id);}
  },
  retry(){for(const [id,entry] of entries)if(!entry.running)void drain(id);},
 };
}
