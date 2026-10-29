import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {build,loadContent,defaultSource} from '../scripts/build.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'yiyuan-publish-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  // Fixtures must not depend on a real product remaining in the CMS. Editors
  // can rename titles, unpublish or delete every original product later.
  for(const name of ['fonts','css','js','zh'])fs.cpSync(path.join(defaultSource,name),path.join(root,name),{recursive:true});
  for(const file of ['index.html','products.html','product.html','about.html','contact.html','privacy.html','maintenance.html','admin.html'])fs.copyFileSync(path.join(defaultSource,file),path.join(root,file));
  fs.mkdirSync(path.join(root,'content/products'),{recursive:true});
  fs.mkdirSync(path.join(root,'images/products'),{recursive:true});
  const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=','base64');
  for(const name of ['sample.png','detail.png'])fs.writeFileSync(path.join(root,'images/products',name),pixel);
  const bi=(en,zh)=>({en,zh});
  const categories=Object.fromEntries(['particleboard','mdf','furniture','other'].map((key,i)=>[key,{number:String(i+1),title:bi(key,'测试分类'+i),short:bi(key,'测试'+i),description:bi('Test collection','测试分类'),cover:'images/products/sample.png'}]));
  fs.writeFileSync(path.join(root,'content/site.json'),JSON.stringify({settings:{company:'Test Wood',companyNames:bi('Test Wood Co.','测试木业'),email:'test@example.com',phone:'',contactName:'Test',whatsapp:'+8612300000000',whatsappDisplay:'+86 12300000000',address:bi('Test address','测试地址'),about:bi('Test company','测试公司')},categories,assets:{courtyard:'images/products/sample.png',entrance:'images/products/sample.png'}}));
  save(root,'fixture-board',{published:true,category:'particleboard',title:bi('Fixture Board','测试板'),summary:bi('Fixture summary','测试简介'),description:bi('Fixture description','测试介绍'),features:{en:['Fixture feature'],zh:['测试优点']},applications:bi('Fixture use','测试用途'),specs:[],cover:'images/products/sample.png',gallery:['images/products/detail.png'],featured:true,order:1});
  return root;
}
function file(root,id){return path.join(root,'content/products',id+'.json');}
function read(root,id){return JSON.parse(fs.readFileSync(file(root,id),'utf8'));}
function save(root,id,p){fs.writeFileSync(file(root,id),JSON.stringify(p));}
function published(root){const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/data/products.js'),'utf8'),context);return context.window.YIYUAN_PRODUCTS;}

test('CMS image upload, new entry and bilingual pages reach the published output',t=>{
  const root=fixture(t);
  const p=read(root,'fixture-board');
  const image='/images/products/cms-upload-测试 photo.jpg';
  fs.copyFileSync(path.join(root,p.cover),path.join(root,image.slice(1)));
  p.title={en:'CMS Test Board',zh:'后台新增测试板'};
  p.cover=image;p.gallery=[image,'/'+p.gallery[0]];p.published=true;
  save(root,'20261026-123456',p);
  const result=build({source:root});
  const created=published(root).find(p=>p.id==='20261026-123456');
  assert.ok(created);
  assert.equal(created.cover,'images/products/cms-upload-%E6%B5%8B%E8%AF%95%20photo.jpg');
  assert.ok(!created.gallery.includes(created.cover));
  assert.equal(created.page,'products/20261026-123456.html');
  assert.ok(fs.readFileSync(path.join(root,'dist/products/20261026-123456.html'),'utf8').includes('CMS Test Board'));
  assert.ok(fs.readFileSync(path.join(root,'dist/zh/products/20261026-123456.html'),'utf8').includes('后台新增测试板'));
  assert.ok(!fs.existsSync(path.join(root,'dist/content')));
  assert.ok(!fs.existsSync(path.join(root,'dist/.pages.yml')));
  assert.equal(result.out,path.join(root,'dist'));
});

test('drafts, unpublish and delete do not leave old product pages behind',t=>{
  const root=fixture(t),id='fixture-board';
  const original=read(root,id);original.published=true;save(root,id,original);
  build({source:root});assert.ok(fs.existsSync(path.join(root,'dist/products',id+'.html')));
  const draft={published:false};save(root,'draft-only',draft);
  original.published=false;save(root,id,original);build({source:root});
  assert.ok(!published(root).some(p=>p.id===id||p.id==='draft-only'));
  assert.ok(!fs.existsSync(path.join(root,'dist/products',id+'.html')));
  original.published=true;save(root,id,original);build({source:root});
  assert.ok(published(root).some(p=>p.id===id));
  fs.unlinkSync(file(root,id));build({source:root});
  assert.ok(!fs.existsSync(path.join(root,'dist/zh/products',id+'.html')));
});

test('company edits update normal and JavaScript-disabled contact details; custom domain is retained',t=>{
  const root=fixture(t),siteFile=path.join(root,'content/site.json');
  const site=JSON.parse(fs.readFileSync(siteFile,'utf8'));site.settings.email='updated@example.com';
  fs.writeFileSync(siteFile,JSON.stringify(site));fs.writeFileSync(path.join(root,'CNAME'),'www.example.com\n');
  build({source:root});
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/data/site.js'),'utf8'),context);
  assert.equal(context.window.YIYUAN_SITE.settings.email,'updated@example.com');
  for(const p of ['index.html','zh/contact.html','products/fixture-board.html'])assert.ok(fs.readFileSync(path.join(root,'dist',p),'utf8').includes('mailto:updated@example.com'));
  assert.equal(fs.readFileSync(path.join(root,'dist/CNAME'),'utf8'),'www.example.com\n');
});

test('a broken upload stops the build without replacing the previous output',t=>{
  const root=fixture(t),id='fixture-board';
  build({source:root});const before=fs.readFileSync(path.join(root,'dist/data/products.js'),'utf8');
  const p=read(root,id);p.published=true;p.cover='/images/products/not-uploaded.jpg';save(root,id,p);
  assert.throws(()=>build({source:root}),/图片文件不存在/);
  assert.equal(fs.readFileSync(path.join(root,'dist/data/products.js'),'utf8'),before);
  p.cover='/images/../content/site.json';save(root,id,p);
  assert.throws(()=>loadContent(root),/请选择网站图片库/);
});

test('edited text stays inert in generated HTML and JavaScript',t=>{
  const root=fixture(t),p=read(root,'fixture-board');p.published=true;
  p.title.en='Board </script><img src=x onerror=alert(1)> & "quoted"';
  p.summary.en='Text </script> <tag> & more';
  save(root,'fixture-board',p);build({source:root});
  const h=fs.readFileSync(path.join(root,'dist/products/fixture-board.html'),'utf8');
  assert.ok(h.includes('&lt;/script&gt;&lt;img'));
  assert.ok(!h.includes('<img src=x'));
  const data=fs.readFileSync(path.join(root,'dist/data/products.js'),'utf8');
  assert.ok(!data.includes('</script>'));
  assert.equal(published(root).find(p=>p.id==='fixture-board').title.en,p.title.en);
});
