import {useMemo} from 'react';
import katex from 'katex';
import {splitStudyText} from './studyText';

export function typesetMath(source:string,display=false):string{
 const html=katex.renderToString(source,{displayMode:display,throwOnError:true,strict:'error',trust:false,output:'htmlAndMathml',maxExpand:1000,maxSize:20});
 if(/class="katex-error"|color:\s*#cc0000/i.test(html))throw new Error('Unsupported mathematical command.');
 return html;
}

export function RenderedMath({source,display=false}:{source:string;display?:boolean}){
 const rendered=useMemo(()=>{
  try{return {html:typesetMath(source,display)};}
  catch{return {error:true};}
 },[source,display]);
 if(rendered.error)return <span className="math-error" role="status">This expression could not be typeset. Please report this question.</span>;
 return <span className={display?'math-block':'math-inline'} tabIndex={display?0:undefined} dangerouslySetInnerHTML={{__html:rendered.html!}}/>;
}

export function StudyText({text}:{text:string}){
 const segments=useMemo(()=>splitStudyText(text),[text]);
 return <>{segments.map((part,index)=>part.kind==='math'?<RenderedMath key={index} source={part.value} display={part.display}/>:part.kind==='code'?<code key={index}>{part.value}</code>:part.value)}</>;
}
