import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {type Item,type Event,emptyState,templates,itemSchema,hash,xorshift} from '../src/domain/model';
import {parseAnswer,parseReal,gradeAnswer,attempt,projectEvidence,selectNextQuestion,planMock,finaliseMock,oracle} from '../src/domain/logic';
const all=templates.flatMap(t=>JSON.parse(readFileSync(`public/catalogue/${t}.json`,'utf8')) as Item[]);
const item=all.find(i=>i.template==='R2')!;
function events(kinds:({kind:Event['kind']}&Record<string,unknown>)[]):Event[]{const session=crypto.randomUUID();return kinds.map((k,n)=>({id:crypto.randomUUID(),seq:n+1,session,itemId:item.id,at:new Date().toISOString(),...k}) as Event);}
const present={kind:'present' as const,reason:'test',seed:1,rehearsal:false};
const submit=(correct:boolean)=>({kind:'submit' as const,input:correct?item.expected:'9999999',correct,external:false,grading:1});
describe('strict parsing',()=>{
 it.each([['+001234','1234'],['1,234','1234'],[' −1234 ','-1234'],['-0','0'],['9007199254740993','9007199254740993']])('normalizes %s',(raw,want)=>expect(parseAnswer(raw)).toEqual({ok:true,value:want}));
 it.each(['','1,23','1,234,56','1e3','1.0','0x10','4+3','23 junk','NaN','Infinity','9'.repeat(257)])('rejects %s',raw=>expect(parseAnswer(raw).ok).toBe(false));
 it.each(['NaN','Infinity','0x10','2x','1+1',''])('rejects non-real %s',raw=>expect(parseReal(raw)).toBeNull());
 it('parses finite reals strictly',()=>expect(parseReal(' -1.2e3 ')).toBe(-1200));
 it('grades exact integers beyond Number safety',()=>expect(gradeAnswer({...item,expected:'9007199254740993'},'9007199254740992')).toEqual({ok:true,correct:false}));
});
describe('attempt state machine',()=>{
 it('keeps retries separate',()=>expect(attempt(events([present,submit(false),submit(true)]),item.id).outcome).toBe('Correct after retries'));
 it('marks hints permanently',()=>expect(attempt(events([present,{kind:'hint',level:1},submit(true)]),item.id).outcome).toBe('Hint-assisted'));
 it('cannot upgrade revealed success',()=>{const a=attempt(events([present,{kind:'reveal'},submit(true)]),item.id);expect(a.correct).toBe(false);expect(a.afterReveal).toBe(true);expect(a.outcome).toBe('Studied/revealed');});
 it('preserves legitimate success after reveal',()=>expect(attempt(events([present,submit(true),{kind:'reveal'}]),item.id).outcome).toBe('First-try unassisted'));
 it('rejects duplicate success',()=>expect(()=>attempt(events([present,submit(true),submit(true)]),item.id)).toThrow());
 it('rejects submissions after skip',()=>expect(()=>attempt(events([present,{kind:'skip'},submit(true)]),item.id)).toThrow());
 it('rejects jumping hints',()=>expect(()=>attempt(events([present,{kind:'hint',level:3}]),item.id)).toThrow());
 it('preserves external assistance',()=>expect(attempt(events([present,{...submit(true),external:true}]),item.id).outcome).toBe('External help'));
});
describe('approved catalogue',()=>{
 it('contains all 2770 verified renderings',()=>expect(all.length).toBe(2770));
 it('strictly validates every item and TS oracle',()=>{for(const q of all){itemSchema.parse(q);expect(oracle(q),q.id).toBe(q.expected);}});
 it('verifies every content hash',async()=>{for(const q of all){const {contentHash,...body}=q;expect(await hash(body)).toBe(contentHash);}});
 it('isolates practice and holdout groups',()=>{const practice=new Set(all.filter(q=>q.pool==='practice').map(q=>q.group));expect(all.some(q=>q.pool==='heldout'&&practice.has(q.group))).toBe(false);});
 it('limits P2 to ten shared tolerance groups',()=>expect(new Set(all.filter(q=>q.template==='P2').map(q=>q.group)).size).toBe(10));
 it('pins PRNG vectors',()=>{let n=1;expect(Array.from({length:5},()=>n=xorshift(n))).toEqual([270369,67634689,2647435461,307599695,2398689233]);});
 it('replays deterministic selection',()=>expect(selectNextQuestion(emptyState(),all,'Exam')).toEqual(selectNextQuestion(emptyState(),all,'Exam')));
 it('never scores repeats as fresh groups',()=>{const s=emptyState();s.snapshots=[item];s.events=events([present,submit(true)]);expect(projectEvidence(s,'R2').count).toBe(1);expect(projectEvidence(s,'R2').label).not.toBe('Consistent recent performance');});
});
describe('mock isolation and freezing',()=>{
 const plan=planMock(emptyState(),all,'paper',1);
 const mock={id:crypto.randomUUID(),shape:'paper' as const,itemIds:plan.items.map(q=>q.id),startedAt:new Date().toISOString(),expiresAt:null,status:'active' as const,answers:{},flags:[],rehearsal:false,reason:plan.reason,results:{},finishedAt:null,seed:1};
 it('uses linked R2 and independent other groups',()=>{expect(plan.items.map(q=>q.template)).toEqual(['R2','R2','P2','M1']);expect(plan.items[0].group).toBe(plan.items[1].group);expect(new Set(plan.items.map(q=>q.group)).size).toBe(3);});
 it('uses heldout groups only',()=>expect(plan.items.every(q=>q.pool==='heldout')).toBe(true));
 it('labels exhausted approximation as rehearsal',()=>{const s=emptyState();s.snapshots=all.filter(q=>q.template==='P2'&&q.pool==='heldout');expect(planMock(s,all,'paper',7).rehearsal).toBe(true);});
 it('freezes blanks as unanswered',()=>{const result=finaliseMock(mock,plan.items,new Date().toISOString());expect(Object.values(result.results)).toEqual(['unanswered','unanswered','unanswered','unanswered']);expect(finaliseMock(result,plan.items,new Date().toISOString())).toBe(result);});
 it('rejects invalid final answers',()=>expect(()=>finaliseMock({...mock,answers:{[mock.itemIds[0]]:'3x'}},plan.items,new Date().toISOString())).toThrow());
 it('keeps original invalid input when timer expires',()=>{const result=finaliseMock({...mock,answers:{[mock.itemIds[0]]:'3x'}},plan.items,new Date().toISOString(),true);expect(result.answers[mock.itemIds[0]]).toBe('3x');expect(result.results[mock.itemIds[0]]).toBe('incorrect');});
});
