import {openDB,type IDBPDatabase} from 'idb';
import {type State,type Event,type Item,type Mock,emptyState,stateSchema,eventSchema,itemSchema,mockSchema,hash,canonical} from '../domain/model';
import {attempt,applyAttemptEvent,gradeAnswer,finaliseMock} from '../domain/logic';
export type Command={id:string;expectedRevision:number;event?:Event;snapshot?:Item;mock?:Mock;draft?:{id:string;answer:string;scratch:string};settings?:State['settings']};
export class Store{
 db:IDBPDatabase|undefined; token=crypto.randomUUID(); ephemeral=false; memory=emptyState(); readonly=false;
 async open(){try{this.db=await openDB('looplab-v1',1,{upgrade(db){db.createObjectStore('data');db.createObjectStore('meta');},blocked:()=>{this.readonly=true;},blocking:()=>{this.db?.close();this.readonly=true;}});}catch{this.ephemeral=true;}}
 async read():Promise<State>{return this.db?(await this.db.get('data','state') as State|undefined)??emptyState():structuredClone(this.memory);}
 async lease(now=Date.now()):Promise<boolean>{if(!this.db)return true;const tx=this.db.transaction('meta','readwrite');const old=await tx.store.get('lease') as {token:string;until:number}|undefined;if(old&&old.token!==this.token&&old.until>now){await tx.done;this.readonly=true;return false;}await tx.store.put({token:this.token,until:now+30000},'lease');await tx.done;this.readonly=false;return true;}
 async release(){if(!this.db)return;const tx=this.db.transaction('meta','readwrite');const l=await tx.store.get('lease') as {token:string}|undefined;if(l?.token===this.token)await tx.store.delete('lease');await tx.done;}
 async write(c:Command):Promise<State>{
  const tx=this.db?.transaction(['data','meta'],'readwrite');
  try{
   if(tx){const lease=await tx.objectStore('meta').get('lease') as {token:string;until:number}|undefined;if(!lease||lease.token!==this.token||lease.until<Date.now())throw new Error('Another tab owns the writer lease.');if(await tx.objectStore('meta').get('command:'+c.id)){const saved=await tx.objectStore('data').get('state') as State;await tx.done;return saved;}}
   const s:State=tx?(await tx.objectStore('data').get('state') as State|undefined)??emptyState():structuredClone(this.memory);
   if(s.revision!==c.expectedRevision)throw new Error('State changed in another action. Reload and retry.');
   if(c.snapshot){itemSchema.parse(c.snapshot);const old=s.snapshots.find(i=>i.id===c.snapshot?.id);if(old&&canonical(old)!==canonical(c.snapshot))throw new Error('Immutable snapshot cannot change.');if(!old)s.snapshots.push(c.snapshot);}
   if(c.event){const e=eventSchema.parse(c.event);if(s.events.some(v=>v.id===e.id))throw new Error('Duplicate event ID.');if(s.mocks.some(m=>m.id===e.session&&m.status==='active')&&e.kind!=='present')throw new Error('No practice interactions during active mocks.');if(e.seq!==s.events.length+1)throw new Error('Invalid event sequence.');if(!s.snapshots.some(i=>i.id===e.itemId))throw new Error('Missing question snapshot.');if(e.kind!=='present'){const prior=s.events.filter(v=>v.itemId===e.itemId&&v.session===e.session);if(!prior.some(v=>v.kind==='present'))throw new Error('Present the question first.');applyAttemptEvent(attempt(prior,e.itemId,e.session),e);}if(e.kind==='submit'){const item=s.snapshots.find(i=>i.id===e.itemId)!;const g=gradeAnswer(item,e.input);if(!g.ok||g.correct!==e.correct)throw new Error('Invalid submission payload.');}s.events.push(e);}
   if(c.mock){mockSchema.parse(c.mock);if(new Set(c.mock.itemIds).size!==4||c.mock.itemIds.some(id=>!s.snapshots.some(i=>i.id===id))||Object.keys(c.mock.answers).some(id=>!c.mock!.itemIds.includes(id))||c.mock.flags.some(id=>!c.mock!.itemIds.includes(id)))throw new Error('Invalid mock references.');if(c.mock.status==='finalized'){const expected=finaliseMock({...c.mock,status:'active',finishedAt:null,results:{}},s.snapshots,c.mock.finishedAt!,true);if(canonical(expected.results)!==canonical(c.mock.results))throw new Error('Invalid mock results.');}const old=s.mocks.find(m=>m.id===c.mock?.id);if(old){if(old.status==='finalized')throw new Error('Finalised mocks are immutable.');for(const field of ['id','shape','itemIds','startedAt','expiresAt','seed','rehearsal','reason'] as const)if(canonical(old[field])!==canonical(c.mock[field]))throw new Error('Mock configuration is immutable.');s.mocks=s.mocks.map(m=>m.id===c.mock?.id?c.mock:m);}else s.mocks.push(c.mock);}
   if(c.draft)s.drafts[c.draft.id]={answer:c.draft.answer,scratch:c.draft.scratch};if(c.settings)s.settings=c.settings;s.revision++;
   stateSchema.parse(s);
   if(tx){await tx.objectStore('data').put(s,'state');await tx.objectStore('meta').put(true,'command:'+c.id);await tx.done;}else this.memory=s;
   return s;
  }catch(error){if(tx){try{tx.abort();await tx.done;}catch{/* aborted transaction preserves live data */}}throw error;}
 }
 async replace(s:State,revision:number):Promise<State>{
  const tx=this.db?.transaction(['data','meta'],'readwrite');try{
   if(tx){const lease=await tx.objectStore('meta').get('lease') as {token:string;until:number}|undefined;if(lease?.token!==this.token||lease.until<Date.now())throw new Error('Writer lease required.');const old=await tx.objectStore('data').get('state') as State|undefined;if((old?.revision??0)!==revision)throw new Error('State changed since restore preview.');}
   const next={...s,revision:revision+1};if(tx){const lease=await tx.objectStore('meta').get('lease');await tx.objectStore('meta').clear();await tx.objectStore('meta').put(lease,'lease');await tx.objectStore('data').put(next,'state');await tx.done;}else this.memory=next;return next;
  }catch(error){if(tx){try{tx.abort();await tx.done;}catch{/* atomic rollback */}}throw error;}
 }
}
export function exportBackup(state:State){return JSON.stringify({app:'LoopLab',version:1,contentVersion:1,state},null,2);}
export async function validateBackup(text:string):Promise<State>{
 if(new TextEncoder().encode(text).length>20*1024*1024)throw new Error('Backup exceeds 20 MiB.');
 const raw=JSON.parse(text) as {app?:string;version?:number;contentVersion?:number;state?:unknown};if(raw.app!=='LoopLab'||raw.version!==1||raw.contentVersion!==1||Object.keys(raw).some(k=>!['app','version','contentVersion','state'].includes(k)))throw new Error('Unsupported backup version or format.');
 const s=stateSchema.parse(raw.state),ids=new Set<string>(),groups=new Set<string>();
 for(const item of s.snapshots){if(ids.has(item.id))throw new Error('Duplicate snapshot.');ids.add(item.id);const {contentHash,...body}=item;if(await hash(body)!==contentHash)throw new Error('Snapshot hash mismatch.');groups.add(item.group);}
 const eventIds=new Set<string>();const prior:Event[]=[];
 for(const [index,e]of s.events.entries()){
  if(e.seq!==index+1||eventIds.has(e.id)||!ids.has(e.itemId))throw new Error('Invalid event references or sequence.');eventIds.add(e.id);
  if(e.kind==='submit'){const item=s.snapshots.find(i=>i.id===e.itemId)!;const g=gradeAnswer(item,e.input);if(!g.ok||g.correct!==e.correct)throw new Error('Submission grade mismatch.');}
  if(e.kind!=='present'){if(!prior.some(v=>v.kind==='present'&&v.itemId===e.itemId&&v.session===e.session))throw new Error('Interaction before presentation.');applyAttemptEvent(attempt(prior,e.itemId,e.session),e);}prior.push(e);
 }
 const mockIds=new Set<string>();for(const m of s.mocks){if(mockIds.has(m.id)||new Set(m.itemIds).size!==4||m.itemIds.some(id=>!ids.has(id))||Object.keys(m.answers).some(id=>!m.itemIds.includes(id)))throw new Error('Invalid mock references.');mockIds.add(m.id);if((m.status==='finalized')!==(m.finishedAt!==null))throw new Error('Invalid finalisation state.');if(m.flags.some(id=>!m.itemIds.includes(id))||new Set(m.flags).size!==m.flags.length)throw new Error('Invalid mock flags.');if(m.status==='active'&&Object.keys(m.results).length)throw new Error('Active mock leaked grades.');if(m.status==='finalized'){const expected=finaliseMock({...m,status:'active',finishedAt:null,results:{}},s.snapshots,m.finishedAt!,true);if(canonical(expected.results)!==canonical(m.results))throw new Error('Frozen results mismatch.');}}
 for(const id of Object.keys(s.drafts))if(!ids.has(id))throw new Error('Draft refers to missing snapshot.');
 return s;
}
export function download(name:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
