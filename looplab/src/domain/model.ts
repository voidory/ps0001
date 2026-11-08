import {z} from 'zod';
export const templates=['R1','R2','R3','R4','A1','A2','T1','T2','P1','P2','U1','M1'] as const;
export type Template=typeof templates[number];
export const bands=['Foundation','Exam','Transfer'] as const;
export type Band=typeof bands[number];
export const titles:Record<Template,string>={R1:'Affine recurrence',R2:'Two-term recurrence',R3:'Index-dependent recurrence',R4:'Three-term recurrence',A1:'Filtered polynomial sum',A2:'Recurrence prefix sum',T1:'Sequence threshold',T2:'Prefix-sum threshold',P1:'Geometric approximation',P2:'Pi-series approximation',U1:'Simultaneous updates',M1:'Matrix evolution'};
export const supported:Record<Template,readonly Band[]>={R1:['Foundation'],R2:['Foundation','Exam'],R3:['Exam','Transfer'],R4:['Transfer'],A1:['Foundation','Exam'],A2:['Exam','Transfer'],T1:['Foundation','Exam'],T2:['Transfer'],P1:['Foundation','Exam'],P2:['Exam'],U1:bands,M1:['Foundation','Exam']};
const int=z.string().regex(/^-?(?:0|[1-9]\d*)$/).max(30);
export const itemSchema=z.object({id:z.string().max(80),template:z.enum(templates),band:z.enum(bands),form:z.enum(['0','1']),pool:z.enum(['practice','heldout']),parameters:z.record(z.string(),int),expected:int,trace:z.array(z.array(z.string().max(100))).max(10),group:z.string().length(64),fingerprint:z.string().length(64),parameterSetId:z.string().length(64),versions:z.object({template:z.literal(1),renderer:z.literal(1),grading:z.literal(1),prng:z.literal(1)}).strict(),structure:z.object({stateWidth:z.number().int().min(1).max(6),stopKind:z.enum(['fixed','threshold','tolerance']),formulaKind:z.enum(templates),indexConvention:z.literal('zero-based'),accumulatorCount:z.number().int().min(0).max(2),scaffoldLevel:z.enum(bands)}).strict(),provenance:z.object({author:z.literal('LoopLab original templates'),review:z.literal('independently-verified'),manifestVersion:z.literal(1)}).strict(),formula:z.string().max(4000),prompt:z.string().max(4000),python:z.string().max(8000),hints:z.array(z.string().max(2000)).length(3),check:z.string().max(2000),traceHeaders:z.array(z.string().max(80)).max(6),explanation:z.string().max(4000),contentHash:z.string().length(64)}).strict();
export type Item=z.infer<typeof itemSchema>;
const base={id:z.uuid(),seq:z.number().int().positive(),session:z.uuid(),itemId:z.string().max(80),at:z.string().datetime()};
export const eventSchema=z.discriminatedUnion('kind',[
 z.object({...base,kind:z.literal('present'),reason:z.string().max(1000),rehearsal:z.boolean(),seed:z.number().int().nonnegative()}).strict(),
 z.object({...base,kind:z.literal('submit'),input:z.string().max(256),correct:z.boolean(),external:z.boolean(),grading:z.literal(1)}).strict(),
 z.object({...base,kind:z.literal('hint'),level:z.number().int().min(1).max(3)}).strict(),
 ...(['reveal','skip','difficulty','repair-complete'] as const).map(kind=>z.object({...base,kind:z.literal(kind)}).strict())
]);
export type Event=z.infer<typeof eventSchema>;
export const mockSchema=z.object({id:z.uuid(),shape:z.enum(['paper','mixed']),itemIds:z.array(z.string()).length(4),startedAt:z.string().datetime(),expiresAt:z.number().finite().nullable(),status:z.enum(['active','finalized']),answers:z.record(z.string(),z.string().max(256)),flags:z.array(z.string()),rehearsal:z.boolean(),reason:z.string(),results:z.record(z.string(),z.enum(['correct','incorrect','unanswered'])),finishedAt:z.string().datetime().nullable(),seed:z.number().int().nonnegative()}).strict();
export type Mock=z.infer<typeof mockSchema>;
export const stateSchema=z.object({schema:z.literal(1),revision:z.number().int().nonnegative(),events:z.array(eventSchema).max(100000),snapshots:z.array(itemSchema).max(10000),mocks:z.array(mockSchema).max(10000),drafts:z.record(z.string(),z.object({answer:z.string().max(256),scratch:z.string().max(50000)}).strict()),settings:z.object({theme:z.enum(['system','light','dark']),lastExport:z.string().nullable()}).strict()}).strict();
export type State=z.infer<typeof stateSchema>;
export const emptyState=():State=>({schema:1,revision:0,events:[],snapshots:[],mocks:[],drafts:{},settings:{theme:'system',lastExport:null}});
export function canonical(x:unknown):string{if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';return '{'+Object.entries(x).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';}
export async function hash(x:unknown):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(x))))).map(v=>v.toString(16).padStart(2,'0')).join('');}
export function xorshift(seed:number):number{let x=seed||1;x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;}
