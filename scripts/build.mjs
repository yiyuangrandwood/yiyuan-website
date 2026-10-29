/* Node.js built-ins only. Content edited by Pages CMS is the source of truth. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const defaultSource = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const categoryKeys = ['particleboard','mdf','furniture','other'];
const own = (obj,key) => Object.hasOwn(obj,key);
function problem(message) { throw new Error(message); }
function object(value,label) {
  if(!value || Array.isArray(value) || typeof value!=='object') problem(label+' 必须是资料对象');
  return value;
}
function string(value,label,required=false) {
  if(value===undefined || value===null) value='';
  if(typeof value!=='string') problem(label+' 必须是文字');
  value=value.trim();
  if(required && !value) problem(label+' 尚未填写');
  return value;
}
function bilingual(value,label,required=false) {
  const v=object(value||{},label);
  const out={en:string(v.en,label+' · English',required),zh:string(v.zh,label+' · 中文',required)};
  if(Boolean(out.en)!==Boolean(out.zh)) problem(label+' 的中英文请一并填写后再上架');
  return out;
}
function list(value,label) {
  if(value===undefined || value===null) return [];
  if(!Array.isArray(value)) problem(label+' 必须是列表');
  return value;
}
function boolean(value,label,fallback=false) {
  if(value===undefined || value===null) return fallback;
  if(typeof value!=='boolean') problem(label+' 必须是勾选值');
  return value;
}
function imagePath(value,source,label,required=false) {
  const raw=string(value,label,required);
  if(!raw)return '';
  let decoded;
  try{decoded=decodeURIComponent(raw.replace(/^\/+/,''));}catch{problem(label+' 的图片路径无效');}
  const parts=decoded.split('/');
  if(parts[0]!=='images' || parts.some(p=>!p||p==='.'||p==='..') || /[\\?#\x00-\x1f]/.test(decoded) || !/\.(jpe?g|png|webp|gif)$/i.test(decoded)) {
    problem(label+' 请选择网站图片库中的 JPG、PNG、WebP 或 GIF 图片');
  }
  const filename=path.join(source,...parts);
  if(!fs.existsSync(filename)||!fs.statSync(filename).isFile())problem(label+' 图片文件不存在：'+decoded);
  if(fs.lstatSync(filename).isSymbolicLink())problem(label+' 不支持图片链接文件');
  return parts.map(encodeURIComponent).join('/');
}
function readJSON(filename) {
  try{return JSON.parse(fs.readFileSync(filename,'utf8'));}
  catch(error){problem(path.basename(filename)+' 无法读取，请检查后台保存的资料格式：'+error.message);}
}

export function loadContent(source=defaultSource) {
  const raw=object(readJSON(path.join(source,'content/site.json')),'公司资料');
  const settings=object(raw.settings,'公司资料.settings');
  const cleanSettings={
    company:string(settings.company,'页头品牌',true),
    companyNames:bilingual(settings.companyNames,'完整公司名称',true),
    email:string(settings.email,'联系邮箱',true),
    phone:string(settings.phone,'电话'),
    contactName:string(settings.contactName,'联系人'),
    whatsapp:string(settings.whatsapp,'WhatsApp'),
    whatsappDisplay:string(settings.whatsappDisplay,'WhatsApp显示格式'),
    address:bilingual(settings.address,'公司地址',true),
    about:bilingual(settings.about,'公司介绍')
  };
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanSettings.email))problem('联系邮箱格式不正确');
  const categories={};
  for(const key of categoryKeys) {
    const c=object(raw.categories?.[key],'分类 '+key);
    categories[key]={
      number:string(c.number,'分类编号')||String(categoryKeys.indexOf(key)+1).padStart(2,'0'),
      title:bilingual(c.title,'分类标题 '+key,true),
      short:bilingual(c.short,'分类简称 '+key,true),
      description:bilingual(c.description,'分类简介 '+key),
      cover:imagePath(c.cover,source,'分类图片 '+key,key!=='other')
    };
  }
  const assets={};
  for(const name of ['courtyard','entrance'])assets[name]=imagePath(raw.assets?.[name],source,'公司照片 '+name,true);
  const site={version:4,settings:cleanSettings,categories,assets};
  const products=[],drafts=[];
  const contentDir=path.join(source,'content/products');
  const names=fs.readdirSync(contentDir).filter(name=>name.endsWith('.json')).sort();
  for(const name of names) {
    const id=name.slice(0,-5);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))problem('产品文件名只支持英文小写、数字及短横线：'+name);
    const p=object(readJSON(path.join(contentDir,name)),name);
    if(!boolean(p.published,name+' 上架状态')){drafts.push(id);continue;}
    if(!categoryKeys.includes(p.category))problem(name+' 请选择有效的产品分类');
    const title=bilingual(p.title,name+' 产品名称',true);
    const context=title.zh+' ('+name+')';
    const features={en:[],zh:[]};
    for(const lang of ['en','zh'])features[lang]=list(p.features?.[lang],context+' 产品优点').map(v=>string(v,context+' 产品优点')).filter(Boolean);
    if(Boolean(features.en.length)!==Boolean(features.zh.length))problem(context+' 的产品优点请一并填写中英文');
    const cover=imagePath(p.cover,source,context+' 主图',true);
    const gallery=[...new Set(list(p.gallery,context+' 细节图').filter(Boolean).map(v=>imagePath(v,source,context+' 细节图')))].filter(v=>v!==cover);
    if(gallery.length>20)problem(context+' 细节图最多20张');
    const specs=list(p.specs,context+' 规格').map((entry,index)=>{
      const s=object(entry,context+' 规格第'+(index+1)+'行');
      const label=bilingual(s.label,context+' 参数名称');
      const value=bilingual(s.value,context+' 参数内容');
      if((value.en||value.zh)&&(!label.en||!label.zh))problem(context+' 参数内容已有填写，请补齐中英文参数名称');
      return {label,value};
    }).filter(s=>s.value.en||s.value.zh);
    const order=p.order===undefined||p.order===null?100:p.order;
    if(typeof order!=='number'||!Number.isFinite(order)||order<0)problem(context+' 显示顺序必须是非负数字');
    products.push({id,category:p.category,title,
      summary:bilingual(p.summary,context+' 一句话卖点'),
      description:bilingual(p.description,context+' 产品介绍'),
      features,applications:bilingual(p.applications,context+' 使用场景'),specs,cover,gallery,
      featured:boolean(p.featured,context+' 首页推荐'),order,page:'products/'+id+'.html'});
  }
  products.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  return {site,products,drafts};
}

const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fallback(site,lang) {
  const s=site.settings;
  return `<noscript><main class="shell privacy-page"><h1>${escape(s.companyNames[lang])}</h1><p>${escape(s.address[lang])}</p><p>WhatsApp: <a href="https://wa.me/${s.whatsapp.replace(/\D/g,'').replace(/^00/,'')}">${escape(s.whatsappDisplay||s.whatsapp)} · ${escape(s.contactName)}</a></p><p>Email: <a href="mailto:${escape(s.email)}">${escape(s.email)}</a></p><p>${lang==='en'?'Please enable JavaScript to browse products.':'请启用JavaScript以浏览产品。'}</p></main></noscript>`;
}
function refreshFallback(template,site,lang) {
  return template.replace(/<noscript>[\s\S]*?<\/noscript>/,()=>fallback(site,lang));
}
function productHTML(source,p,lang,site) {
  let template=fs.readFileSync(path.join(source,lang==='zh'?'zh/product.html':'product.html'),'utf8');
  const prefix=lang==='zh'?'../../':'../';
  template=template.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+escape(p.title[lang])+' · '+escape(site.settings.company)+'</title>');
  template=template.replace(/<meta name="description" content="[^"]*">/,()=>'<meta name="description" content="'+escape(p.summary[lang])+'">');
  template=template.replace(/<link rel="alternate"[^>]*>/,()=>'<link rel="alternate" hreflang="'+(lang==='zh'?'en':'zh')+'" href="'+(lang==='zh'?'../../products/':'../zh/products/')+p.id+'.html">');
  template=template.replace(/(href|src)="(?:\.\.\/)?(css\/|data\/|js\/)/g,(_,attr,folder)=>attr+'="'+prefix+folder);
  template=template.replace(/<body data-page="product" data-root="[^"]*">/,()=>'<body data-page="product" data-root="'+prefix+'" data-product="'+p.id+'">');
  return refreshFallback(template,site,lang);
}
function copyDirectory(from,to) {
  fs.mkdirSync(to,{recursive:true});
  for(const e of fs.readdirSync(from,{withFileTypes:true})) {
    if(e.isSymbolicLink())problem('发布目录不支持符号链接：'+e.name);
    if(e.isDirectory())copyDirectory(path.join(from,e.name),path.join(to,e.name));
    else if(e.isFile())fs.copyFileSync(path.join(from,e.name),path.join(to,e.name));
  }
}
function outputJSON(value) {
  return JSON.stringify(value,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
}
export function build({source=defaultSource}={}) {
  source=path.resolve(source);
  // Validate before replacing the previous local output. CI deploy runs only on success.
  const {site,products,drafts}=loadContent(source);
  const out=path.join(source,'dist');
  fs.rmSync(out,{recursive:true,force:true});
  fs.mkdirSync(out,{recursive:true});
  for(const name of ['images','fonts','css','js'])copyDirectory(path.join(source,name),path.join(out,name));
  const pageNames=['index.html','products.html','product.html','about.html','contact.html','privacy.html'];
  for(const lang of ['en','zh']) {
    const prefix=lang==='zh'?'zh/':'';
    fs.mkdirSync(path.join(out,prefix,'products'),{recursive:true});
    for(const file of pageNames) {
      const sourceFile=path.join(source,prefix,file);
      fs.writeFileSync(path.join(out,prefix,file),refreshFallback(fs.readFileSync(sourceFile,'utf8'),site,lang));
    }
    for(const p of products)fs.writeFileSync(path.join(out,prefix,p.page),productHTML(source,p,lang,site));
  }
  for(const file of ['admin.html','maintenance.html'])fs.copyFileSync(path.join(source,file),path.join(out,file));
  fs.mkdirSync(path.join(out,'data'),{recursive:true});
  fs.writeFileSync(path.join(out,'data/site.js'),'/* Generated from content/site.json. */\nwindow.YIYUAN_SITE = '+outputJSON(site)+';\n');
  fs.writeFileSync(path.join(out,'data/products.js'),'/* Generated from published product files. */\nwindow.YIYUAN_PRODUCTS = '+outputJSON(products)+';\n');
  fs.writeFileSync(path.join(out,'.nojekyll'),'');
  if(fs.existsSync(path.join(source,'CNAME'))) {
    const domain=fs.readFileSync(path.join(source,'CNAME'),'utf8').trim();
    if(!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(domain)||!domain.includes('.'))problem('CNAME域名格式不正确');
    fs.writeFileSync(path.join(out,'CNAME'),domain+'\n');
  }
  return {out,published:products.length,drafts:drafts.length};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    if(process.argv.includes('--check')) {
      const {products,drafts}=loadContent();
      console.log('资料校验通过：'+products.length+'款上架产品，'+drafts.length+'款未上架产品。');
    } else {
      const result=build();
      console.log('网站生成成功：'+result.published+'款产品，'+result.drafts+'款未上架。发布目录：'+result.out);
    }
  } catch(error) {
    console.error('发布已停止：'+error.message);
    process.exitCode=1;
  }
}
