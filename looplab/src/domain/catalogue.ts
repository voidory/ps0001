import {itemSchema,hash,type Item,type Template} from './model';
import {instantiateApprovedQuestion} from './logic';
let loaded:Promise<Item[]>|undefined;
export function loadCatalogue():Promise<Item[]>{
 loaded??=(async()=>{const response=await fetch(import.meta.env.BASE_URL+'catalogue/manifest.json');if(!response.ok)throw new Error('Cannot load the approved catalogue.');const manifest=await response.json() as {templates:Record<Template,{file:string;sha256:string}>};
 const chunks=await Promise.all(Object.values(manifest.templates).map(async entry=>{const r=await fetch(import.meta.env.BASE_URL+'catalogue/'+entry.file);if(!r.ok)throw new Error('Missing approved question chunk.');const text=await r.text();const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==entry.sha256)throw new Error('Catalogue hash mismatch.');const items=itemSchema.array().parse(JSON.parse(text));for(const item of items){const {contentHash,...body}=item;if(await hash(body)!==contentHash)throw new Error('Question hash mismatch.');instantiateApprovedQuestion(item);}return items;}));return chunks.flat();})();return loaded;
}
