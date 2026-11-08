import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {templates,type Item} from '../src/domain/model';
import {legacyNotation,questionPrompt,splitStudyText,traceValue} from '../src/presentation/studyText';
import {StudyText,typesetMath,RenderedMath} from '../src/presentation/StudyText';

const all=templates.flatMap(t=>JSON.parse(readFileSync(`public/catalogue/${t}.json`,'utf8')) as Item[]);

describe('mathematical presentation',()=>{
 it('typesets inline delimiters, display delimiters, dollar delimiters and code separately',()=>{
  const parts=splitStudyText('Find \\(x_{12}\\). \\[A^{10}\\] $y^2$ $$z_1$$ `for k in range(8)`');
  expect(parts.filter(p=>p.kind==='math').map(p=>[p.value,!!p.display])).toEqual([['x_{12}',false],['A^{10}',true],['y^2',false],['z_1',true]]);
  expect(parts.find(p=>p.kind==='code')?.value).toBe('for k in range(8)');
 });
 it('upgrades old snapshots without nesting delimiters or splitting multi-digit indices',()=>{
  expect(legacyNotation('Find x_12 and u_10, S_k and A^15.')).toBe('Find \\(x_{12}\\) and \\(u_{10}\\), \\(S_{k}\\) and \\(A^{15}\\).');
  expect(splitStudyText('Find x_12.').filter(p=>p.kind==='math')).toEqual([{kind:'math',value:'x_{12}',display:false}]);
 });
 it('does not interpret Python or escaped HTML as mathematical notation',()=>{
  const code='for k in range(8): x = x**2 if x <= 9 else 0';
  const html=renderToStaticMarkup(createElement(StudyText,{text:'`'+code+'` <script>alert(1)</script>'}));
  expect(html).toContain('<code>');expect(html).not.toContain('class="katex"');expect(html).toContain('&lt;script&gt;');
 });
 it('provides HTML plus accessible MathML, including true subscripts and powers',()=>{
  const html=typesetMath('u_{12}+A^{10}');expect(html).toContain('katex-mathml');expect(html).toContain('<msub>');expect(html).toContain('<msup>');expect(html).not.toContain('katex-error');
 });
 it('reports invalid expressions without showing raw TeX',()=>{
  const html=renderToStaticMarkup(createElement(RenderedMath,{source:'\\unknowncommand{x}'}));
  expect(html).toContain('could not be typeset');expect(html).not.toContain('unknowncommand');expect(html).not.toContain('katex-error');
 });
 it('formats scientific trace notation without altering plain exact integers',()=>{expect(traceValue('1.25e-07')).toBe('\\(1.25\\times 10^{-7}\\)');expect(traceValue('9007199254740993')).toBe('9007199254740993');expect(traceValue('…')).toBe('…');});
 it('does not allow trusted HTML commands',()=>{
  expect(()=>typesetMath('\\href{javascript:alert(1)}{click}')).toThrow();
 });
 it.each(templates)('renders every %s formula, prompt, hint and base check strictly',template=>{
  for(const item of all.filter(q=>q.template===template)){
   const snapshot=JSON.stringify(item);
   expect(()=>typesetMath(item.formula,true),item.id).not.toThrow();
   const prompt=questionPrompt(item);
   expect(prompt).not.toMatch(/(?<!\\\()\b[uxS]_\d/);
   for(const text of [prompt,item.check,...item.hints,item.explanation,...item.traceHeaders,...item.trace.flat().map(traceValue)]){
    for(const part of splitStudyText(text))if(part.kind==='math')expect(()=>typesetMath(part.value,part.display),item.id+': '+part.value).not.toThrow();
   }
   expect(JSON.stringify(item)).toBe(snapshot);
  }
 });
 it('keeps approximation boundaries, strict thresholds, full powers and matrix products exact',()=>{
  for(const q of all.filter(q=>q.template==='P1'||q.template==='P2'))expect(questionPrompt(q)).toContain(`\\left|L-S_K\\right|\\leq 10^{-${q.parameters.e}}`);
  for(const q of all.filter(q=>q.template==='T1'||q.template==='T2'))expect(questionPrompt(q)).toContain(`${q.form==='1'?'>':'\\geq'}${q.parameters.target}`);
  for(const q of all.filter(q=>q.template==='M1')){expect(questionPrompt(q)).toContain(`A^{${q.parameters.n}}`);expect(questionPrompt(q)).toContain('wa+xc&wb+xd\\\\ya+zc&yb+zd');}
 });
});
