import type {Item} from '../domain/model';

export function traceValue(value:string):string{
 const match=/^(-?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/.exec(value);
 return match?`\\(${match[1]}\\times 10^{${Number(match[2])}}\\)`:value;
}

export type StudySegment={kind:'text'|'math'|'code';value:string;display?:boolean};

// Explicit markup is authoritative. Only legacy prose outside math/code spans is
// upgraded, so Python operators, student notes and immutable snapshots stay intact.
export function legacyNotation(text:string):string{
 return text.replace(/range\(N \+ 1\)|\b(?:[uxS]_(?:\d+|[kKj])|A\^\d+|[NjkKxyz])\b/g,token=>{
  if(token.startsWith('range'))return '`'+token+'`';
  return `\\(${token.replace(/_([\dkKj]+)/,'_{$1}').replace(/\^(\d+)/,'^{$1}')}\\)`;
 });
}

export function splitStudyText(text:string,legacy=true):StudySegment[]{
 const result:StudySegment[]=[];
 const pattern=/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|`([^`\n]+)`/g;
 let cursor=0;
 for(const match of text.matchAll(pattern)){
  if(match.index!>cursor){const raw=text.slice(cursor,match.index);result.push(...(legacy?splitStudyText(legacyNotation(raw),false):[{kind:'text' as const,value:raw}]));}
  if(match[5]!==undefined)result.push({kind:'code',value:match[5]});
  else result.push({kind:'math',value:match[1]??match[2]??match[3]??match[4],display:match[2]!==undefined||match[3]!==undefined});
  cursor=match.index!+match[0].length;
 }
 if(cursor<text.length){const raw=text.slice(cursor);result.push(...(legacy?splitStudyText(legacyNotation(raw),false):[{kind:'text' as const,value:raw}]));}
 return result;
}

const math=(value:string)=>`\\(${value}\\)`;
// These are presentation-only equivalents of the compiler's twelve templates.
// Do not rewrite catalogue items: saved attempts depend on their original hashes.
export function questionPrompt(item:Item):string{
 const p=item.parameters,n=p.n,f=item.form==='1';
 switch(item.template){
  case 'R1':return `Find ${math(f?`x_{${Number(n)+1}}-x_{${n}}`:`x_{${n}}`)}.`;
  case 'R2':case 'R4':return `Find ${math(`u_{${n}}`+(f?`+u_{${Number(n)-1}}`:''))}.`;
  case 'R3':return `Find ${math(`u_{${n}}`)}.`;
  case 'A1':return `Sum ${math('v_k')} for ${math(`0\\leq k\\leq ${n}`)}`+(f?`, including only ${math('k')} with remainder 1 on division by ${math(p.d)}.`:', including both endpoints.');
  case 'A2':return `Sum ${math('u_k')} for ${f?'even indices only':'all integer indices'} from ${math('0')} through ${math(n)}, including the applicable base terms.`;
  case 'T1':case 'T2':return `Find the smallest ${math('k\\geq 0')} such that ${math(`${item.template==='T1'?'x_k':'S_k'}${f?'>':'\\geq'}${p.target}`)}. Test index 0 before any update.`;
  case 'P1':case 'P2':return `Add terms in ascending ${math('j')}, starting at ${math('j=0')}. Stop at the first ${math('K')} with ${math(`\\left|L-S_K\\right|\\leq 10^{-${p.e}}`)}. Return ${f?`the number of included terms ${math('K+1')}`:`the last included index ${math('K')}`}. Use ordinary Python floats, with no intermediate rounding.`;
  case 'U1':return `Initially ${math(`x=${p.x},\\ y=${p.y}`+(f?`,\\ z=${p.z}`:''))}. Perform exactly ${math(n)} simultaneous updates. ALL right-hand sides use the OLD values. Return ${math(f?'z':'x')}.`;
  case 'M1':return `Find ${f?'the trace (sum of diagonal entries)':'the top-left entry'} of ${math(`A^{${n}}`)}. For ${math('B=\\begin{pmatrix}w&x\\\\y&z\\end{pmatrix}')} and ${math('A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}')}, the product is \\[BA=\\begin{pmatrix}wa+xc&wb+xd\\\\ya+zc&yb+zd\\end{pmatrix}.\\] Update all four entries using the previous matrix.`;
 }
}
