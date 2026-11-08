import {type Item,type Event,type State,type Template,type Band,type Mock,templates,supported,xorshift} from './model';
export function parseAnswer(raw:string):{ok:true;value:string}|{ok:false;error:string}{
 if(raw.length>256)return {ok:false,error:'Answer must be at most 256 characters.'};
 const s=raw.trim().replace(/^−/,'-');
 if(!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(s))return {ok:false,error:'Enter a whole integer (correctly grouped commas are allowed), not an expression, decimal or exponent.'};
 return {ok:true,value:BigInt(s.replaceAll(',','')).toString()};
}
export function parseReal(raw:string):number|null{if(raw.length>256||!/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*$/i.test(raw))return null;const value=Number(raw);return Number.isFinite(value)?value:null;}
export function gradeAnswer(item:Item,raw:string){const p=parseAnswer(raw);return p.ok?{ok:true as const,correct:BigInt(p.value)===BigInt(item.expected)}:p;}
export type Attempt={count:number;first:boolean|null;correct:boolean;hint:number;revealed:boolean;closed:boolean;external:boolean;afterReveal:boolean;outcome:string};
export function applyAttemptEvent(a:Attempt,e:Event):Attempt{
 const n={...a};
 if(e.kind==='submit'){
  if(n.closed||n.correct)throw new Error('This attempt is already closed or correct.');
  n.count++;if(n.first===null)n.first=e.correct;n.external ||= e.external;n.afterReveal ||= n.revealed;
  if(e.correct&&!n.revealed)n.correct=true;
 }else if(e.kind==='hint'){if(n.closed||n.correct)throw new Error('Attempt closed or already correct.');if(e.level!==n.hint+1)throw new Error('Hints must open in order.');n.hint=e.level;}
 else if(e.kind==='reveal'){if(n.revealed)throw new Error('Solution already revealed.');n.revealed=true;}
 else if(e.kind==='skip')n.closed=true;
 n.outcome=n.correct?(n.external?'External help':n.hint?'Hint-assisted':n.first?'First-try unassisted':'Correct after retries'):n.revealed?'Studied/revealed':n.closed?'Skipped':n.count?'Needs practice':'Not assessed';
 return n;
}
export function attempt(events:Event[],itemId:string,session?:string):Attempt{
 return events.filter(e=>e.itemId===itemId&&(!session||e.session===session)).reduce(applyAttemptEvent,{count:0,first:null,correct:false,hint:0,revealed:false,closed:false,external:false,afterReveal:false,outcome:'Not assessed'});
}
export function oracle(item:Item):string{
 const p=item.parameters;const b=(k:string)=>BigInt(p[k]);const num=(k:string)=>Number(p[k]);const n=num('n'),f=num('f'),t=item.template;
 let x=b('x'),y=b('y'),z=b('z');const a=b('a'),bb=b('b'),c=b('c');
 if(t==='R1'){for(let k=0;k<n;k++)x=a*x+bb;return String(f?(a-1n)*x+bb:x);}
 if(['R2','R3','R4','A2'].includes(t)){
  if(t==='R4'){const initial=[x,y,z];if(n<3)return String(initial[n]+(f?initial[n-1]:0n));for(let k=3;k<=n;k++)[x,y,z]=[y,z,a*z+bb*y+c*x];return String(z+(f?y:0n));}
  let total=x+(!f&&n>0?y:0n);
  for(let k=2;k<=n;k++){[x,y]=[y,a*y+bb*x+(t==='R3'?c*BigInt(k)**BigInt(f+1):0n)];if(t==='A2'&&(!f||k%2===0))total+=y;}
  return String(t==='A2'?total:n===0?b('x'):y+(f&&t==='R2'?x:0n));
 }
 if(t==='A1'){let total=0n;for(let k=0;k<=n;k++)if(!f||k%num('d')===1)total+=a*BigInt(k)**2n+bb*BigInt(k)+c;return String(total);}
 if(t==='T1'||t==='T2'){
  let total=x,k=0;const target=b('target');
  while(f?total<=target:total<target){if(++k>5000)throw new Error('Unreachable threshold.');if(t==='T1'){x=a*x+bb;total=x;}else if(k===1)total+=y;else{[x,y]=[y,x+y];total+=y;}}
  return String(k);
 }
 if(t==='P1'||t==='P2'){
  const q=num('q'),s=num('s'),target=t==='P1'?q/((q-1)*q**s):Math.PI,epsilon=10**-num('e');let total=0,k=-1;
  while(Math.abs(target-total)>epsilon){if(++k>100)throw new Error('Floating convergence cap.');total+=t==='P1'?(1/q)**(k+s):(1/16**k)*(4/(8*k+1)-2/(8*k+4)-1/(8*k+5)-1/(8*k+6));}
  return String(k+f);
 }
 if(t==='U1'){for(let k=0;k<n;k++)if(f)[x,y,z]=[y+a*z,x-z,x+bb*y];else [x,y]=[x+a*y,x-bb*y];return String(f?z:x);}
 let w=1n; x=0n;y=0n;z=1n;for(let k=0;k<n;k++)[w,x,y,z]=[w*a+x*c,w*bb+x*b('d'),y*a+z*c,y*bb+z*b('d')];return String(w+(f?z:0n));
}
export function instantiateApprovedQuestion(item:Item):Item{if(oracle(item)!==item.expected)throw new Error('Oracle mismatch. This item is disabled.');return item;}
export function projectEvidence(state:State,t:Template,band?:Band){
 const groups=new Map<string,{a:Attempt;item:Item;session:string}>();
 for(const e of state.events)if(e.kind==='present'&&!state.mocks.some(m=>m.id===e.session)){
  const item=state.snapshots.find(i=>i.id===e.itemId);if(!item||item.template!==t||(band&&item.band!==band)||e.rehearsal)continue;
  const a=attempt(state.events,item.id,e.session);if(a.count||a.revealed||a.closed)groups.set(item.group,{a,item,session:e.session});
 }
 const recent=[...groups.values()].slice(-5),success=recent.filter(g=>g.a.outcome==='First-try unassisted');
 const consistent=success.length>=4&&new Set(success.map(g=>g.item.form)).size>=2&&new Set(success.map(g=>g.session)).size>=2;
 return {count:groups.size,first:[...groups.values()].filter(g=>g.a.outcome==='First-try unassisted').length,label:consistent?'Consistent recent performance':!groups.size?'Not assessed':success.length>=2?'Developing':'Needs practice',recent};
}
export function selectNextQuestion(state:State,all:Item[],band:Band,topic?:Template):{item:Item;reason:string;rehearsal:boolean;seed:number}{
 const seen=new Set(state.snapshots.map(i=>i.group));const seed=xorshift(state.events.length+143217);
 const shown=state.events.filter(e=>e.kind==='present'),last=shown.slice(-2).map(e=>state.snapshots.find(i=>i.id===e.itemId)?.template);
 const priorAnswer=state.snapshots.find(i=>i.id===shown.at(-1)?.itemId)?.expected;
 let candidates=all.filter(i=>i.pool==='practice'&&i.band===band&&(!topic||i.template===topic));
 let reason='Manual topic choice.';
 if(!topic){
  const groups:Template[][]=[['R2','R3'],['A1','A2','T1'],['P1','P2'],['U1','M1']];
  if(shown.length<4){const preferred=groups[shown.length];const subset=candidates.filter(i=>preferred.includes(i.template));if(subset.length)candidates=subset;reason='Exam coverage: rotate recurrence, accumulation, approximation and state updates.';}
  else{
   const weak=templates.filter(t=>supported[t].includes(band)).sort((a,b)=>{const aa=projectEvidence(state,a,band),bb=projectEvidence(state,b,band);return aa.first/Math.max(1,aa.count)-bb.first/Math.max(1,bb.count)||aa.count-bb.count;});
   const needs=weak.find(t=>projectEvidence(state,t,band).recent.slice(-2).filter(e=>e.a.count&&!e.a.correct||e.a.revealed).length>=2);
   const slot=(shown.length-4)%5;
   const target=(slot===0?needs:undefined)??(slot===2?weak.find(t=>projectEvidence(state,t,band).count===0):weak[0]);
   const subset=candidates.filter(i=>i.template===target);if(subset.length)candidates=subset;
   reason=slot===0&&needs?'Repair follow-up after recent difficulties.':slot===2?'Coverage gap: a less-practised family.':'Weak-area follow-up using independent first-try counts, policy v1.';
   if(last.length===2&&last[0]===last[1]){const different=candidates.filter(i=>i.template!==last[0]);if(different.length)candidates=different;else{const alternative=all.filter(i=>i.pool==='practice'&&i.band===band&&i.template!==last[0]);if(alternative.length)candidates=alternative;}}
  }
 }
 const unseen=candidates.filter(i=>!seen.has(i.group));const pool=unseen.length?unseen:candidates;
 if(!pool.length)throw new Error('No approved questions in this band/topic.');
 const varied=pool.filter(i=>i.expected!==priorAnswer);const finalPool=varied.length?varied:pool;const item=instantiateApprovedQuestion(finalPool[seed%finalPool.length]);return {item,reason:reason+(unseen.length?'':' Pool exhausted: exposed-content rehearsal.'),rehearsal:!unseen.length,seed};
}
export function planMock(state:State,all:Item[],shape:'paper'|'mixed',seed:number){
 const seen=new Set(state.snapshots.map(i=>i.group)),chosen:Item[]=[];let rehearsal=false;
 const pick=(ts:Template[])=>{let pool=all.filter(i=>i.pool==='heldout'&&ts.includes(i.template)&&!chosen.some(c=>c.group===i.group));const fresh=pool.filter(i=>!seen.has(i.group));if(fresh.length)pool=fresh;else rehearsal=true;if(!pool.length)throw new Error('Heldout pool unavailable.');const item=pool[xorshift(seed+chosen.length)%pool.length];chosen.push(instantiateApprovedQuestion(item));};
 if(shape==='paper'){
  pick(['R2']);const linked=all.find(i=>i.pool==='heldout'&&i.group===chosen[0].group&&i.form!==chosen[0].form);if(!linked)throw new Error('Linked recurrence unavailable.');chosen.push(linked);pick(['P2']);pick(['M1']);
 }else{pick(['R3','R4']);pick(['A2','T2']);pick(['P1']);pick(['U1','M1']);}
 return {items:chosen,rehearsal,reason:rehearsal?'Exposed-content rehearsal; this is not an unseen mock.':'Never-exposed heldout groups. P2 varies tolerance, not algorithm.'};
}
export function finaliseMock(m:Mock,items:Item[],at:string,expired=false):Mock{
 if(m.status==='finalized')return m;
 const results:Mock['results']={};
 for(const id of m.itemIds){const raw=m.answers[id]??'',item=items.find(i=>i.id===id);if(!item)throw new Error('Missing immutable snapshot.');const p=parseAnswer(raw);if(raw.trim()&&!p.ok&&!expired)throw new Error('Fix invalid answers before finalising.');results[id]=!raw.trim()?'unanswered':p.ok&&p.value===item.expected?'correct':'incorrect';}
 return {...m,status:'finalized',finishedAt:at,results};
}
