import {test,expect,type Page} from '@playwright/test';
import {templates,supported} from '../../src/domain/model';

async function ready(page:Page){await page.goto('/');await expect(page.getByTestId('question')).toBeVisible();}
async function choose(page:Page,template:typeof templates[number]){
 await page.getByRole('combobox',{name:/^Selection/}).selectOption('manual');
 await page.getByRole('combobox',{name:/^Difficulty band/}).selectOption(supported[template][0]);
 await page.getByRole('combobox',{name:/^Topic/}).selectOption(template);
 await page.getByRole('button',{name:'Apply & next question'}).click();
 await expect(page.getByTestId('question')).toHaveAttribute('data-question-id',new RegExp('^'+template+'-'));
}
async function noRawMath(page:Page){
 expect(await page.locator('.katex-error,.math-error').count()).toBe(0);
 const raw=await page.getByTestId('question').evaluate(root=>{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const errors:string[]=[];
  while(walker.nextNode()){
   const node=walker.currentNode,parent=node.parentElement;
   if(!parent||parent.closest('.katex,code,pre,textarea,script,style')||!parent.checkVisibility())continue;
   if(/\\(?:sum|frac|begin|quad|pi|left|right)|[uxS]_\w|A\^\d|\\[()[\]]/.test(node.textContent??''))errors.push(node.textContent??'');
  }
  return errors;
 });
 expect(raw).toEqual([]);
}

test('all twelve families typeset the full prompt, hints, solution and trace headers',async({page})=>{
 await ready(page);
 for(const template of templates){
  await choose(page,template);
  const question=page.getByTestId('question');
  await expect(question.locator('.question-prompt .katex').first()).toBeVisible();
  await expect(question.getByRole('region',{name:'Supplied mathematical rule'}).locator('math')).toHaveCount(1);
  await question.getByRole('button',{name:'Hint 1 / 3'}).click();
  await question.getByRole('button',{name:'Reveal solution',exact:true}).click();
  await question.getByText('State trace and boundary',{exact:true}).click();
  await noRawMath(page);
  if(template==='M1'){await expect(question.locator('.question-prompt .mtable')).toHaveCount(3);await expect(question.locator('.question-prompt msup').first()).toBeAttached();}
  if(template==='P1'||template==='P2'){await expect(question.locator('.question-prompt msup').first()).toBeAttached();await expect(question.locator('.question-prompt').locator('mtext').filter({hasText:'1e-'})).toHaveCount(0);}
 }
});

test('programming font is self-hosted, loaded and leaves source operators unchanged',async({page})=>{
 const failed:string[]=[];
 page.on('response',response=>{if(response.url().includes('.woff')&&!response.ok())failed.push(response.url());});
 await ready(page);await choose(page,'T1');
 const python=await page.evaluate(async()=>{const manifest=await (await fetch('./catalogue/T1.json')).json();const id=document.querySelector('[data-question-id]')?.getAttribute('data-question-id');return manifest.find((q:{id:string})=>q.id===id).python as string;});
 await page.getByRole('button',{name:'Reveal solution',exact:true}).click();
 await expect(page.getByTestId('question').locator('pre code')).toHaveText(python);
 await page.getByText('Code scratchpad — saved, never executed').click();
 const notes='if x <= 10 and y != 0:\n    value = x**2  # x_10 stays Python';
 await page.getByLabel('Your Python notes').fill(notes);await expect(page.getByLabel('Your Python notes')).toHaveValue(notes);
 await page.evaluate(()=>document.fonts.ready);
 const typography=await page.getByTestId('question').locator('pre code').evaluate(el=>({font:getComputedStyle(el).fontFamily,ligatures:getComputedStyle(el).fontVariantLigatures,loaded:document.fonts.check('16px "JetBrains Mono Variable"')}));
 expect(typography.font).toContain('JetBrains Mono Variable');expect(typography.ligatures).toBe('none');expect(typography.loaded).toBe(true);expect(failed).toEqual([]);
});

test('fractions, matrix powers and long displays remain readable at 360px in both themes',async({page})=>{
 await page.setViewportSize({width:360,height:900});await ready(page);
 for(const template of ['P2','M1'] as const){
  await choose(page,template);
  for(const theme of ['light','dark']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await page.evaluate(()=>document.fonts.ready);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   const math=page.getByRole('region',{name:'Supplied mathematical rule'});
   await expect(math).toBeVisible();await noRawMath(page);
   const size=await math.locator('.katex').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));expect(size).toBeGreaterThanOrEqual(16);
   const fonts=await page.evaluate(()=>({main:document.fonts.check('16px KaTeX_Main'),math:document.fonts.check('italic 16px KaTeX_Math')}));expect(fonts.main).toBe(true);expect(fonts.math).toBe(true);
  }
 }
});

test('repair mathematics is rendered but loop syntax remains literal code',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Try a short repair drill'}).click();
 await expect(page.locator('.card').filter({has:page.getByRole('heading',{name:'Short repair drill'})}).locator('.katex').first()).toBeVisible();
 await page.getByLabel('Repair pattern').selectOption('index');await expect(page.locator('code').filter({hasText:'for k in range(2, 8)'})).toBeVisible();
 await page.getByLabel('Repair pattern').selectOption('overwrite');await page.getByLabel('Repair answer').fill('7');await page.getByRole('button',{name:'Check repair'}).click();await expect(page.getByRole('status').filter({hasText:'Correct.'}).locator('.katex')).toHaveCount(1);
});


test('mock questions and final solutions share the same math renderer',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Mock exam',exact:true}).click();
 await page.getByRole('button',{name:'Start paper-shaped mock'}).click();
 for(let n=0;n<4;n++){
  await expect(page.locator('.question-prompt .katex').first()).toBeVisible();
  expect(await page.locator('.math-error,.katex-error').count()).toBe(0);
  if(n<3)await page.getByRole('button',{name:'Next question',exact:true}).click();
 }
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Finalise mock'}).click();
 await page.locator('summary').filter({hasText:/^Question 1 —/}).click();
 await expect(page.getByRole('region',{name:'Supplied mathematical rule'}).locator('.katex')).toBeVisible();
 await expect(page.getByRole('region',{name:'Worked solution'})).toBeVisible();
});

test('restored immutable questions also use the new presentation without data migration',async({page})=>{
 await ready(page);await choose(page,'P1');const id=await page.getByTestId('question').getAttribute('data-question-id');
 await page.getByLabel('Your numerical answer',{exact:true}).fill('123');await page.waitForTimeout(1100);await page.reload();
 await expect(page.getByTestId('question')).toHaveAttribute('data-question-id',id!);
 await expect(page.getByLabel('Your numerical answer',{exact:true})).toHaveValue('123');
 await expect(page.locator('.question-prompt msup')).toBeAttached();await noRawMath(page);
});
