/* 此页仅提供后台入口，登录和仓库权限由 Pages CMS 处理。 */
(()=>{'use strict';const s=window.YIYUAN_SITE.settings;
const footer=document.getElementById('cms-contact');
const name=document.createElement('strong');name.textContent=s.companyNames.zh;footer.append(name);
const address=document.createElement('p');address.textContent=s.address.zh;footer.append(address);
const email=document.createElement('a');email.href='mailto:'+s.email;email.textContent=s.email;footer.append(email);
if(s.whatsapp){const a=document.createElement('a');a.href='https://wa.me/'+s.whatsapp.replace(/\D/g,'').replace(/^00/,'');a.target='_blank';a.rel='noopener noreferrer';a.textContent='WhatsApp · '+s.contactName+' · '+(s.whatsappDisplay||s.whatsapp);footer.append(a);}})();
