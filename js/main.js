/* Yiyuan Wood — traditional HTML + CSS + JavaScript, without a build step.
 * Content: data/site.js and data/products.js. Images: images/.
 * Public pages render the shared header/footer and current data on load.
 * No framework, remote database, CDN, npm installation or fetch required.
 */
(() => {
  'use strict';
  const data = JSON.parse(JSON.stringify({...window.YIYUAN_SITE, products: window.YIYUAN_PRODUCTS}));
  const root = document.body.dataset.root || '';
  const dirtySections = new Set();
  const app = document.getElementById('app');
  const toolbar = document.getElementById('local-toolbar');
  const notice = document.getElementById('toast');
  const isMaintenance = document.body.dataset.page === 'manage';
  let locale = 'en', currentRoute = {}, editingId = data.products[0]?.id || '', editLang = 'en', manageTab = 'products', dirty = false, toastTimer, lastDownloadURL;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt = (en, zh) => locale === 'zh' ? zh : en;
  const loc = value => value?.[locale] || value?.en || value?.zh || '';
  const imageSrc = value => /^(?:images\/[A-Za-z0-9_\-./% ()\u4e00-\u9fff]+\.(?:jpe?g|png|webp|gif|svg)|https?:\/\/[^\s<>"']+)$/i.test(value || '') ? value : '';
  const asset = value => /^https?:\/\//i.test(value || '') ? value : root + (value || '');
  const whatsappDigits = () => String(data.settings.whatsapp || '').replace(/\D/g, '').replace(/^00/, '');
  const companyName = () => loc(data.settings.companyNames) || data.settings.company;
  const categories = data.categories;
  const products = () => [...data.products].sort((a,b) => a.order - b.order);
  const link = (path = 'home', lang = locale) => {
    const [page, query = ''] = path.split('?');
    const file = {home:'index.html', products:'products.html', product:'product.html', about:'about.html', contact:'contact.html', privacy:'privacy.html'}[page] || 'index.html';
    return root + (lang === 'zh' ? 'zh/' : '') + file + (query ? '?' + query : '');
  };
  const catLink = key => link('products' + (key ? '?category=' + encodeURIComponent(key) : ''));
  const productLink = (p, lang=locale) => p.page
    ? root+(lang==='zh'?'zh/':'')+p.page
    : link('product?id='+encodeURIComponent(p.id),lang);
  const withQuery = (url,key,value) => url+(url.includes('?')?'&':'?')+encodeURIComponent(key)+'='+encodeURIComponent(value);
  const icon = (name = 'arrow', size = 20) => {
    const shapes = {
      arrow:'<path d="M7 17 17 7M7 7h10v10"/>', right:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
      layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
      ruler:'<path d="m15 3 6 6L9 21l-6-6L15 3Zm-3 3 3 3M9 9l2 2m-5 1 3 3"/>',
      palette:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r=".8"/><circle cx="13" cy="7" r=".8"/><circle cx="17" cy="11" r=".8"/><path d="M6 16h5l2 5"/>',
      box:'<path d="m12 3 9 5v11l-9 4-9-4V8l9-5Zm-9 5 9 5 9-5m-9 5v10M7 5l9 5"/>',
      pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      mail:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
      phone:'<path d="m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3c-1 5-4 5-8 3C7 17 3 11 3 7c0-3 1-4 4-4Z"/>',
      menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', plus:'<path d="M12 5v14M5 12h14"/>',
      photo:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
      save:'<path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h10V3M7 21v-8h10v8"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', check:'<path d="m5 12 4 4L19 6"/>'
    };
    return '<svg class="icon" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name] || shapes.arrow)+'</svg>';
  };
  const mark = '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
  const brand = () => '<a class="brand" href="'+link()+'" aria-label="'+esc(data.settings.company)+'">'+mark+'<span>'+esc(data.settings.company)+'<small class="brand-sub">PANELS &amp; FURNITURE</small></span></a>';
  const para = text => String(text || '').split('\n').filter(Boolean).map(t=>'<p>'+esc(t)+'</p>').join('');
  const button = (text, href, outline = false) => '<a class="button '+(outline?'button-outline':'button-dark')+'" href="'+esc(href)+'">'+esc(text)+icon()+'</a>';
  function header(page) {
    const nav = [['home',txt('Home','首页')],['products',txt('Products','产品中心')],['about',txt('About us','关于沂源')],['contact',txt('Contact','联系我们')]];
    const links = nav.map(([key,label])=>'<a href="'+link(key)+'" '+(page===key||page==='product'&&key==='products'?'class="active" aria-current="page"':'')+'>'+label+'</a>').join('');
    return '<header class="site-header"><div class="shell header-inner">'+brand()+'<nav class="desktop-nav" aria-label="'+txt('Main navigation','主导航')+'">'+links+'</nav><div class="header-actions"><div class="language" aria-label="Language"><button data-action="language" data-lang="en" aria-pressed="'+(locale==='en')+'">EN</button><span>/</span><button data-action="language" data-lang="zh" aria-pressed="'+(locale==='zh')+'">中文</button></div><a class="header-cta" href="'+link('contact')+'">'+txt('Let’s talk materials','聊聊你的材料需求')+icon()+'</a><details class="mobile-menu"><summary aria-label="'+txt('Open menu','打开导航')+'">'+icon('menu')+'</summary><nav aria-label="'+txt('Mobile navigation','手机导航')+'">'+links+'</nav></details></div></div></header>';
  }
  function footer() {
    const s = data.settings;
    const whatsapp = 'https://wa.me/' + whatsappDigits();
    return `<footer class="site-footer"><div class="shell">
      <div class="footer-top">
        <div class="footer-brand">${brand()}<p>${txt('Materials for furniture.\nPossibilities for your next project.','为家具选择材料，\n为下一个项目找到方向。')}</p></div>
        <div><span class="eyebrow">${txt('EXPLORE','探索沂源')}</span>
          <a href="${link('home')}">${txt('Home','首页')}</a>
          <a href="${link('products')}">${txt('Our products','产品中心')}</a>
          <a href="${link('about')}">${txt('About Yiyuan','关于沂源')}</a>
          <a href="${link('contact')}">${txt('Contact','联系我们')}</a>
        </div>
        <div><span class="eyebrow">${txt('OUR COLLECTION','产品系列')}</span>
          ${Object.keys(categories).filter(c=>c!=='other'||data.products.some(p=>p.category===c)).map(c=>`<a href="${catLink(c)}">${esc(loc(categories[c].short))}</a>`).join('')}
        </div>
        <div class="footer-contact-block"><span class="eyebrow">${txt('CONTACT DETAILS','具体联系方式')}</span>
          <strong class="footer-company">${esc(companyName())}</strong>
          <span class="footer-contact">${icon('pin')}<span>${esc(loc(s.address))}</span></span>
          ${s.whatsapp ? `<a class="whatsapp-link" href="${whatsapp}" target="_blank" rel="noopener noreferrer">${icon('phone')}<span>WhatsApp · ${esc(s.contactName)}<span class="footer-whatsapp-meta">${esc(s.whatsappDisplay || s.whatsapp)}</span></span>${icon('arrow')}</a>` : ''}
          ${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ''}
          ${s.phone ? `<a href="tel:${esc(s.phone.replace(/[^0-9+]/g,''))}">${esc(s.phone)}</a>` : ''}
        </div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(companyName().replace(/\.$/,''))}. ${txt('All rights reserved.','保留所有权利。')}</span>
        <a href="${link('privacy')}">${txt('Privacy','隐私说明')}</a>
        <button class="route-jump" data-action="language" data-lang="${locale==='zh'?'en':'zh'}">English / 中文</button>
      </div>
    </div></footer>`;
  }
  function placeholder() { return '<div class="placeholder-content"><div class="panel-outline" aria-hidden="true"><i></i><i></i><i></i></div><span>'+txt('PRODUCT IMAGE','产品图片预留位')+'</span></div>'; }
  function imageSlot(src,alt) {return '<div class="image-slot">'+(imageSrc(src)?'<img src="'+esc(asset(src))+'" alt="'+esc(alt)+'" loading="lazy"/>':placeholder())+'</div>';}
  function card(p) {return '<a class="product-card" href="'+productLink(p)+'"><div class="product-image-wrap">'+imageSlot(p.cover,loc(p.title))+'<span class="card-round">'+icon()+'</span></div><div class="product-card-copy"><span class="eyebrow">'+esc(loc(categories[p.category]?.short))+'</span><h3>'+esc(loc(p.title))+'</h3><p>'+esc(loc(p.summary))+'</p><span class="text-link">'+txt('Explore this product','查看产品详情')+icon('right')+'</span></div></a>';}
  function sectionTitle(label,title,href='',labelLink='') {return '<div class="section-title"><div><span class="eyebrow">'+esc(label)+'</span><h2>'+esc(title)+'</h2></div>'+(href?'<a class="text-link" href="'+esc(href)+'">'+esc(labelLink||txt('View all','查看全部'))+icon()+'</a>':'')+'</div>';}
  function breadcrumb(items) {return '<nav class="breadcrumb" aria-label="'+txt('Breadcrumb','当前位置')+'"><a href="'+link()+'">'+txt('Home','首页')+'</a>'+items.map(i=>'<span><span class="crumb-divider">/</span>'+(i.href?'<a href="'+esc(i.href)+'">'+esc(i.title)+'</a>':'<span>'+esc(i.title)+'</span>')+'</span>').join('')+'</nav>';}
  function steps() {
    return '<div class="how-grid">'+[
      ['layers',txt('Start with the application','说明你的用途'),txt('Tell us what you are making, where the material will be used and how much you need.','告诉我们板材用在哪个部位、什么环境，以及数量需求。')],
      ['palette',txt('Define the board & finish','确认板材与饰面'),txt('Compare the board specification, thickness and decor. Review small samples where needed.','核对基材、厚度和花色，必要时通过小样确认表面。')],
      ['box',txt('Agree the order details','确定订单细节'),txt('Confirm the model, quantity, packing and delivery conditions before production.','在排产前确认型号、数量、包装与交付条件。')]
    ].map(([i,t,p],n)=>'<div><div class="step-head"><span>0'+(n+1)+'</span>'+icon(i)+'</div><h3>'+t+'</h3><p>'+p+'</p></div>').join('')+'</div>';
  }
  function home() {
    const selected = products().filter(p=>p.featured).slice(0,3);
    const featured = selected.length?selected:products().slice(0,3);
    return '<main id="main-content"><section class="home-hero"><div class="shell hero-layout"><div class="hero-copy"><div class="hero-eyebrow"><span></span>'+txt('MATERIALS FOR FURNITURE & INTERIORS','面向家具与室内项目的材料选择')+'</div><h1>'+txt('The right panel.<br>A better<br><em>starting point.</em>','合适的板材，<br>是更好作品的<br><em>起点。</em>')+'</h1><p>'+txt('From the thickness of a panel to the finish of a space. Explore particleboard, MDF and furniture for your next material schedule.','从一块板的厚度，到一整个项目的饰面。探索沂源刨花板、密度板与家具，为你的下一份材料清单找到方向。')+'</p>'+button(txt('Explore our collection','探索产品系列'),link('products'))+'<div class="hero-footnote">'+icon('layers')+'<span>'+txt('Wood-based panels & furniture','人造板材与家具')+'</span></div></div><div class="hero-visual"><img src="'+esc(asset(data.assets.courtyard))+'" alt="'+txt('Supplier-provided photograph of a production setting','客户提供的生产场地实拍')+'" fetchpriority="high"><div class="hero-image-shade"></div><span class="hero-image-label">SHANDONG, CHINA</span><div class="hero-image-caption"><span>'+txt('IT STARTS WITH MATERIAL','从材料开始')+'</span><p>'+txt('Considered details.\nClearly defined specifications.','看得见的细节，\n说得清的规格。')+'</p><a href="'+link('about')+'" aria-label="'+txt('About Yiyuan','关于沂源')+'">'+icon()+'</a></div><div class="hero-number">01 — 03</div></div></div></section><div class="spec-strip"><div class="shell strip-inner">'+[
      ['ruler','9 / 12 / 15 / 18 mm',txt('Melamine panel thickness options','饰面板厚度选项')],['layers','1220 × 2440 mm',txt('Standard panel size','板材标准幅面')],['palette',txt('A finish for your brief','花色按需确认'),txt('Decor & branding options','饰面与标识选项')]
    ].map(([i,t,d])=>'<div>'+icon(i)+'<span><strong>'+t+'</strong><small>'+d+'</small></span></div>').join('')+'</div></div><section class="section shell category-section">'+sectionTitle(txt('OUR COLLECTION','我们的产品'),txt('Materials for\nwhat you have in mind.','为不同想法，\n找到材料。'),link('products'),txt('Discover all products','浏览所有产品'))+'<div class="category-grid">'+['particleboard','mdf','furniture'].map(c=>'<a href="'+catLink(c)+'" class="category-item category-'+c+'"><div class="category-top"><span>'+categories[c].number+'</span>'+icon()+'</div><div class="category-photo"><img src="'+esc(asset(categories[c].cover))+'" alt="'+esc(loc(categories[c].title))+'" loading="lazy"></div><div class="category-copy"><h3>'+esc(loc(categories[c].title))+'</h3><p>'+esc(loc(categories[c].description))+'</p></div></a>').join('')+'</div></section><section class="featured-section"><div class="shell section">'+sectionTitle(txt('SELECTED PRODUCTS','重点产品'),txt('A good place to begin.','从这里，开始选材。'),link('products'))+'<div class="product-grid">'+featured.map(card).join('')+'</div></div></section><section class="section shell about-teaser"><div class="about-photo"><img src="'+esc(asset(data.assets.entrance))+'" loading="lazy" alt="'+txt('Supplier-provided production setting','客户提供的生产场地照片')+'"><span>'+txt('A CLOSER LOOK','场地实拍')+'</span></div><div class="about-teaser-copy"><span class="eyebrow">'+txt('ABOUT YIYUAN','关于沂源')+'</span><h2>'+txt('Better material choices\nstart with a clear brief.','好的选材，\n从清晰的沟通开始。')+'</h2><p>'+txt('We bring the material conversation back to your project. The board, the thickness, the surface, the sample and the delivery plan — defined together, one detail at a time.','我们将板材选择与实际用途联系起来。从基材、厚度、饰面到样品和交付，逐项确认对你的项目有影响的细节。')+'</p><a class="text-link" href="'+link('about')+'">'+txt('Get to know Yiyuan','了解沂源')+icon('right')+'</a></div></section><section class="how-section"><div class="shell section">'+sectionTitle(txt('FROM BRIEF TO BOARD','如何开始'),txt('A clearer way\nto specify your materials.','让采购需求，\n变得更清楚。'))+steps()+'</div></section><section class="closing-section shell"><span class="eyebrow">'+txt('YOUR NEXT PROJECT','你的下一个项目')+'</span><h2>'+txt('Let’s start with\nyour material schedule.','让我们从\n一份材料清单开始。')+'</h2>'+button(txt('Talk to Yiyuan','联系沂源'),link('contact'))+'</section></main>';
  }
  function catalog(route) {
    const category = categories[route.query.get('category')]?route.query.get('category'):'';
    const search = (route.query.get('q') || '').trim();
    const all = products();
    const filtered = all.filter(p=>(!category||p.category===category)&&(!search||[p.title.en,p.title.zh,p.summary.en,p.summary.zh].some(v=>v.toLowerCase().includes(search.toLowerCase()))));
    const pageCount = Math.max(1,Math.ceil(filtered.length/6));
    const page = Math.min(pageCount,Math.max(1,parseInt(route.query.get('page'))||1));
    const shown = filtered.slice((page-1)*6,page*6);
    const pageLink = n => {const query = new URLSearchParams();if(category)query.set('category',category);if(search)query.set('q',search);if(n>1)query.set('page',n);return link('products'+(query.size?'?'+query.toString():''));};
    return '<main id="main-content"><section class="page-heading"><div class="shell"><span class="eyebrow">'+txt('THE MATERIAL COLLECTION','我们的产品')+'</span><div class="page-heading-row"><h1>'+esc(category?loc(categories[category].title):txt('Good materials.\nMore possibilities.','为你的想法，\n选择合适的材料。'))+'</h1><p>'+esc(category?loc(categories[category].description):txt('Explore our panels and furniture. Choose the board, thickness and finish around the way you work.','浏览板材与家具系列，按用途选择基材、厚度和饰面。'))+'</p></div></div></section><div class="shell">'+breadcrumb([{title:txt('Products','产品中心'),href:category?catLink(''):''},...(category?[{title:loc(categories[category].short)}]:[])])+'<div class="catalog-layout"><aside class="catalog-sidebar"><span class="eyebrow">'+txt('BROWSE BY CATEGORY','产品分类')+'</span><nav aria-label="'+txt('Product categories','产品分类')+'"><a class="'+(!category?'selected':'')+'" href="'+catLink('')+'"><span>'+txt('All products','全部产品')+'</span><small>'+String(all.length).padStart(2,'0')+'</small></a>'+Object.keys(categories).filter(c=>c!=='other'||all.some(p=>p.category==='other')).map(c=>'<a class="'+(category===c?'selected':'')+'" href="'+catLink(c)+'"><span>'+esc(loc(categories[c].short))+'</span><small>'+String(all.filter(p=>p.category===c).length).padStart(2,'0')+'</small></a>').join('')+'</nav><div class="sidebar-note"><span>'+txt('Have a material schedule?','有材料清单？')+'</span><p>'+txt('Start with the application, specification and quantity you need.','提供用途、规格与数量，我们从具体需求开始沟通。')+'</p><a href="'+link('contact')+'" class="text-link">'+txt('Talk to Yiyuan','联系沂源')+icon()+'</a></div></aside><div class="catalog-results"><form id="catalog-search" class="site-search" role="search">'+icon('search')+'<input name="q" type="search" value="'+esc(search)+'" placeholder="'+txt('Search products, then press Enter','搜索产品，按回车确认')+'" aria-label="'+txt('Search products','搜索产品')+'"><input name="category" type="hidden" value="'+esc(category)+'"><button type="submit" class="route-jump">'+txt('Search','搜索')+'</button></form><div class="results-top"><span>'+txt(filtered.length+' '+(filtered.length===1?'product':'products'),'共 '+filtered.length+' 款产品')+'</span><span>'+txt('Explore the collection','按产品系列展示')+'</span></div>'+(shown.length?'<div class="product-grid">'+shown.map(card).join('')+'</div>':'<div class="empty-state"><h2>'+txt('No products found.','暂时没有匹配的产品。')+'</h2><a class="text-link" href="'+catLink('')+'">'+txt('Browse all products','返回全部产品')+'</a></div>')+(pageCount>1?'<nav class="pagination" aria-label="'+txt('Pagination','产品分页')+'">'+Array.from({length:pageCount},(_,i)=>'<a class="'+(page===i+1?'current':'')+'" href="'+pageLink(i+1)+'" '+(page===i+1?'aria-current="page"':'')+'>'+(i+1)+'</a>').join('')+'</nav>':'')+'</div></div></div></main>';
  }
  function detail(p,route) {
    const images = [p.cover,...p.gallery].filter(imageSrc);
    const selectedImage = Math.min(images.length-1,Math.max(0,parseInt(route.query.get('image'))||0));
    const currentImage = images[selectedImage] || '';
    const imageLink = index => withQuery(productLink(p),'image',index);
    const jumpLink = section => withQuery(productLink(p),'section',section);
    const specs = p.specs.filter(s=>loc(s.value));
    const others=products().filter(q=>q.id!==p.id);
    const related=[...others.filter(q=>q.category===p.category),...others.filter(q=>q.category!==p.category)].slice(0,3);
    const thumbs = Array.from({length:images.length || 4},(_,i)=>images[i]?'<a class="empty-thumb '+(i===selectedImage?'selected':'')+'" style="'+(i===selectedImage?'border-color:#7b8e62':'')+'" href="'+imageLink(i)+'" aria-label="'+txt('View image '+(i+1),'查看图片 '+(i+1))+'"><img src="'+esc(asset(images[i]))+'" alt="'+esc(loc(p.title))+' '+(i+1)+'"></a>':'<span class="empty-thumb" aria-hidden="true"><span>0'+(i+1)+'</span></span>').join('');
    return '<main id="main-content"><div class="shell">'+breadcrumb([{title:txt('Products','产品中心'),href:catLink('')},{title:loc(categories[p.category]?.short),href:catLink(p.category)},{title:loc(p.title)}])+'<div class="detail-hero"><div><div class="gallery-main">'+(currentImage?'<img src="'+esc(asset(currentImage))+'" alt="'+esc(loc(p.title))+'">':'<div class="gallery-placeholder">'+placeholder()+'</div>')+'</div><div class="gallery-thumbs">'+thumbs+'</div></div><div class="detail-intro"><span class="eyebrow">'+esc(loc(categories[p.category]?.title))+'</span><h1>'+esc(loc(p.title))+'</h1><p class="detail-summary">'+esc(loc(p.summary))+'</p><div class="detail-key-specs">'+specs.slice(0,4).map(s=>'<div><span>'+esc(loc(s.label))+'</span><strong>'+esc(loc(s.value))+'</strong></div>').join('')+'</div><p class="small-note">'+(p.category==='furniture'?txt('Confirm the dimensions, materials, included accessories and delivery conditions for your selected model.','请按所选款式确认尺寸、材料、配件范围及交付条件。'):txt('Grade, application and delivery conditions are confirmed against the agreed order specification.','具体等级、用途与交付条件，以双方确认的订单规格为准。'))+'</p><div class="detail-contact">'+button(txt('Ask ELLA about this product','向ELLA咨询这款产品'),'https://wa.me/'+whatsappDigits()+'?text='+encodeURIComponent(txt('Hello ELLA, I am interested in ','ELLA您好，我想咨询')+loc(p.title)+txt('. Could you confirm specifications, order quantity and lead time?','。请帮我确认规格、起订量与交期。')))+'<a class="text-link" href="mailto:'+esc(data.settings.email)+'?subject='+encodeURIComponent(txt('Product enquiry: ','产品咨询：')+loc(p.title))+'">'+txt('Email product enquiry','邮件咨询')+icon('mail')+'</a></div></div></div><nav class="detail-anchor-nav" aria-label="'+txt('Product sections','产品详情栏目')+'"><a href="'+jumpLink('overview')+'">'+txt('Overview','产品介绍')+'</a><a href="'+jumpLink('specifications')+'">'+txt('Specifications','产品规格')+'</a><a href="'+jumpLink('applications')+'">'+txt('Features & applications','特点与应用')+'</a></nav><section class="detail-section" id="overview"><div><span class="eyebrow">01 / '+txt('OVERVIEW','产品介绍')+'</span><h2>'+(p.category==='furniture'?txt('A place for\neveryday living.','围绕日常生活，\n安排家具与收纳。'):txt('A material choice,\nshaped around your brief.','从需求出发，\n确认合适的配置。'))+'</h2></div><div class="prose">'+para(loc(p.description))+'</div></section><section class="detail-section" id="specifications"><div><span class="eyebrow">02 / '+txt('SPECIFICATIONS','产品规格')+'</span><h2>'+txt('The details,\nclearly defined.','细节，清楚呈现。')+'</h2></div><dl class="spec-table">'+specs.map(s=>'<div><dt>'+esc(loc(s.label))+'</dt><dd>'+esc(loc(s.value))+'</dd></div>').join('')+'</dl></section><section class="detail-section" id="applications"><div><span class="eyebrow">03 / '+txt('FEATURES & APPLICATIONS','特点与应用')+'</span><h2>'+txt('What matters\nfor your project.','选材时，\n值得关注的事。')+'</h2></div><div><ul class="feature-list">'+(p.features[locale]?.length?p.features[locale]:p.features.en.length?p.features.en:p.features.zh).map(f=>'<li>'+icon('plus')+'<span>'+esc(f)+'</span></li>').join('')+'</ul><div class="application-note">'+icon('layers')+'<div><h3>'+txt('Application notes','应用说明')+'</h3><p>'+esc(loc(p.applications))+'</p></div></div></div></section>'+(related.length?'<section class="section related-section">'+sectionTitle(txt('KEEP EXPLORING','继续探索'),txt('More to work with.','更多产品选择。'))+'<div class="product-grid">'+related.map(card).join('')+'</div></section>':'')+'</div></main>';
  }
  function about() {return '<main id="main-content"><section class="page-heading about-heading"><div class="shell"><span class="eyebrow">'+txt('GET TO KNOW YIYUAN','关于沂源')+'</span><h1>'+txt('A clear brief.\nA considered material choice.','让材料，\n与实际需求相遇。')+'</h1></div></section><section class="shell about-story"><span class="eyebrow">'+txt('OUR APPROACH','我们的方向')+'</span><div><h2>'+txt('For the makers,\nthe buyers and the next project.','从家具制造，\n到你的下一个室内项目。')+'</h2>'+para(loc(data.settings.about))+'</div></section><div class="shell factory-photo-wide"><img src="'+esc(asset(data.assets.entrance))+'" alt="'+txt('Supplier-provided photograph of a production setting','客户提供的生产场地实拍')+'"><div><span>SHANDONG, CHINA</span><span>'+txt('A look at the production setting','生产场地实拍')+'</span></div></div><section class="shell section">'+sectionTitle(txt('THE DETAILS THAT MATTER','关注具体细节'),txt('A little more clarity,\nat every step.','把采购的每一步，\n说得更清楚。'))+steps()+'</section><section class="about-bottom"><div class="shell"><h2>'+txt('Find your starting point.','看看适合你的产品。')+'</h2>'+button(txt('Explore the collection','探索产品'),link('products'))+'</div></section></main>';}
  function contact() {
    const s = data.settings;
    const row = (i,label,value,href='') => '<'+(href?'a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer"':'div')+'>'+icon(i)+'<span><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></span>'+(href?icon():'')+'</'+(href?'a':'div')+'>';
    return '<main id="main-content"><section class="page-heading"><div class="shell"><span class="eyebrow">'+txt('LET’S TALK MATERIALS','联系我们')+'</span><div class="page-heading-row"><h1>'+txt('Your next project\nstarts with a conversation.','你的下一份\n材料清单，从这里开始。')+'</h1><p>'+txt('Tell us the application, specification and quantity. We’ll start with the details that matter to your order.','告诉我们你的用途、规格和数量。我们从这些具体信息开始沟通。')+'</p></div></div></section><section class="shell contact-layout"><div><h2>'+txt('Get in touch with Yiyuan.','联系沂源')+'</h2><div class="contact-rows">'+row('layers',txt('COMPANY','公司名称'),companyName())+row('pin',txt('ADDRESS','地址'),loc(s.address))+(s.email?row('mail',txt('EMAIL','邮箱'),s.email,'mailto:'+s.email):'')+(s.phone?row('phone',txt('PHONE','电话'),s.phone,'tel:'+s.phone.replace(/[^0-9+]/g,'')):'')+(s.whatsapp?row('phone','WHATSAPP · '+s.contactName,s.whatsappDisplay || s.whatsapp,'https://wa.me/'+whatsappDigits()):'')+'</div>'+'</div><div class="contact-brief"><span class="eyebrow">'+txt('A FEW USEFUL DETAILS','联系前，可以准备这些信息')+'</span><h2>'+txt('Make your brief\na little clearer.','让需求，\n更容易被理解。')+'</h2><ol>'+[
      [txt('The application','用途与产品类型'),txt('What you are making and where the material will be used.','产品用在哪里、做成什么，是否有使用环境要求。')],
      [txt('The specification','规格与饰面'),txt('Board type, dimensions, thickness, decor and any sample requirements.','基材、尺寸、厚度、花色，以及样品需求。')],
      [txt('The order & timing','数量与计划'),txt('Approximate quantity, destination and the date you are working towards.','预计采购量、目的地，以及希望的出厂或到货时间。')]
    ].map(([t,p],i)=>'<li><span>0'+(i+1)+'</span><div><strong>'+t+'</strong><p>'+p+'</p></div></li>').join('')+'</ol></div></section></main>';
  }
  function privacy() {return '<main id="main-content" class="shell privacy-page"><span class="eyebrow">'+txt('PRIVACY','隐私说明')+'</span><h1>'+txt('A simple introduction.','简明的隐私说明。')+'</h1><div class="prose">'+para(txt('This website presents product and company information. It has no registration, checkout or enquiry form, and includes no analytics or advertising scripts.\nContact links open the email, phone or third-party service you choose. Those services apply their own privacy terms.\nProduct and company pictures are ordinary files in this website’s images folder. The optional maintenance tool edits local data files; it does not send or publish your changes.','本网站用于展示产品和公司资料，不提供注册、支付或询盘表单，也未加入统计或广告脚本。\n联系方式会打开你选择的邮箱、电话或第三方服务，相关服务适用各自的隐私条款。\n图片独立存放在网站的images目录。可选维护工具在浏览器内编辑数据文件，不会发送或发布修改。'))+'</div></main>';}


  function parseRoute() {
    return {
      locale: document.documentElement.lang === 'zh' ? 'zh' : 'en',
      page: document.body.dataset.page || 'home',
      id: document.body.dataset.product || new URLSearchParams(location.search).get('id') || '',
      query: new URLSearchParams(location.search)
    };
  }
  function render({scroll=true}={}) {
    currentRoute = parseRoute();
    locale = currentRoute.locale;
    document.body.classList.toggle('manage-app',isMaintenance);
    if (toolbar) toolbar.hidden = true;
    const p = data.products.find(p=>p.id===currentRoute.id);
    let page=currentRoute.page, content;
    if(page==='manage' && window.YiyuanEditor) content=window.YiyuanEditor.manager();
    else if(page==='products') content=catalog(currentRoute);
    else if(page==='product'&&p) content=detail(p,currentRoute);
    else if(page==='product' && currentRoute.id==='furniture-collection') content=catalog({query:new URLSearchParams('category=furniture')});
    else if(page==='product') content='<main id="main-content" class="shell privacy-page"><h1>'+txt('Product not found','未找到该产品')+'</h1><p>'+txt('The product may have been updated. Please browse the current collection.','该产品可能已更新，请浏览当前产品列表。')+'</p>'+button(txt('View products','浏览产品'),link('products'))+'</main>';
    else if(page==='about') content=about();
    else if(page==='contact') content=contact();
    else if(page==='privacy') content=privacy();
    else {page='home';content=home();}
    document.title=(p&&page==='product'?loc(p.title):({manage:'网站资料维护',products:txt('Our Products','产品中心'),about:txt('About Yiyuan','关于沂源'),contact:txt('Contact','联系我们'),privacy:txt('Privacy','隐私说明')})[page]||txt('Panels for Furniture & Interiors','家具与室内板材'))+' · '+data.settings.company;
    app.innerHTML=(page==='manage'?'':header(page))+content+footer();
    const meta = document.querySelector('meta[name="description"]');
    if(meta && p && page==='product') meta.content=loc(p.summary);
    if(scroll){const section=currentRoute.query.get('section');requestAnimationFrame(()=>{if(section&&['overview','specifications','applications'].includes(section))document.getElementById(section)?.scrollIntoView({behavior:'instant'});});}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action="language"]');
    if(!button)return;
    const lang=button.dataset.lang;
    const page=currentRoute.page==='manage'?'home':currentRoute.page;
    const query=new URLSearchParams(currentRoute.query);
    const product=data.products.find(p=>p.id===currentRoute.id);
    if(page==='product' && product){
      query.delete('id');
      const target=productLink(product,lang);
      location.href=target+(query.size?(target.includes('?')?'&':'?')+query.toString():'');
    }else location.href=link(page+(query.size?'?'+query.toString():''),lang);
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='catalog-search')return;
    event.preventDefault();
    const values=new FormData(event.target), query=new URLSearchParams();
    if(values.get('category'))query.set('category',values.get('category'));
    const q=String(values.get('q')||'').trim();
    if(q)query.set('q',q);
    location.href=link('products'+(query.size?'?'+query.toString():''));
  });
  document.addEventListener('error',event=>{
    const img=event.target;
    if(img.tagName!=='IMG')return;
    const slot=img.closest('.image-slot, .gallery-main');
    if(slot)slot.innerHTML=placeholder();
    else img.hidden=true;
  },true);
  // Only the maintenance page loads js/maintenance.js. Public pages never edit data.
  window.YiyuanSite={data,root,esc,txt,loc,imageSrc,asset,icon,link,productLink,categories,products,render,
    get locale(){return locale;},get route(){return currentRoute;}};
  if(!isMaintenance) render();
})();
