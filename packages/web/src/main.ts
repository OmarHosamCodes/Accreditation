import { TIERS, tierFor } from "@accreditation/shared";
import { apiJSON, authHeader, loadState, saveState } from "./api.ts";
import {
  DB,
  activeWeights,
  catBreakdown,
  computeOverall,
  esc,
  fmtDate,
  setAdminCredentials,
  setDB,
} from "./state.ts";

/* =========================================================
   DATA LAYER  — Bun API-backed shared database
   ========================================================= */

const ICONS={
  check:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>',
  alert:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
  clock:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  clipboard:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="4" width="8" height="4" rx="1"/><path d="M8 7H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2"/></svg>',
  empty:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 15s1.5-2 4-2 4 2 4 2M9 9h.01M15 9h.01"/></svg>',
  inbox:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></svg>',
  checkbox:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 12l2 2 4-4"/></svg>',
  adjustments:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10h16M4 14h16M10 4v16M14 4v16"/></svg>',
  external:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7M10 14L21 3M21 14v7H3V3h7"/></svg>',
  logout:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  save:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
  rocket:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c3-8 11-12 15.5-12 0 4.5-4 12.5-12 15.5-2 .5-3.5 0-3.5 0s-.5-1.5 0-3.5z"/><path d="M12 12l-3 3"/></svg>',
  info:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h2v4h-2z"/></svg>',
  userplus:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
  ruler:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8l16-4v12l-16 4z"/></svg>',
  scale:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M5 7l7-4 7 4M5 17l7 4 7-4"/></svg>',
  users:'<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
};
function ico(name){return ICONS[name]||'';}
function errNotice(errs){return `<div class="notice err">${ico('alert')}<ul class="errlist">${errs.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`;}
function setBtnLoading(btn,loading,loadingLabel){
  if(!btn)return;
  if(loading){
    btn.disabled=true;
    btn.dataset.origHtml=btn.innerHTML;
    btn.classList.add('is-loading');
    btn.textContent=loadingLabel||'Submitting…';
  }else{
    btn.disabled=false;
    btn.classList.remove('is-loading');
    if(btn.dataset.origHtml){btn.innerHTML=btn.dataset.origHtml;delete btn.dataset.origHtml;}
  }
}
function closeNavMenu(){
  const m=document.getElementById('navMenu');
  const t=document.querySelector('.nav-toggle');
  if(m)m.classList.remove('open');
  if(t)t.setAttribute('aria-expanded','false');
}
function bindNav(){
  const t=document.querySelector('.nav-toggle');
  const m=document.getElementById('navMenu');
  if(!t||!m)return;
  t.addEventListener('click',()=>{
    const open=m.classList.toggle('open');
    t.setAttribute('aria-expanded',open?'true':'false');
  });
  m.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeNavMenu));
}
function bindTableRows(){
  document.querySelectorAll('tr[data-audit]').forEach(tr=>{
    tr.setAttribute('tabindex','0');
    tr.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();go('audit',parseInt(tr.dataset.audit,10));}
    });
  });
  document.querySelectorAll('.lb-card[data-audit]').forEach(card=>{
    card.setAttribute('tabindex','0');
    card.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();go('audit',parseInt(card.dataset.audit,10));}
    });
    card.addEventListener('click',()=>go('audit',parseInt(card.dataset.audit,10)));
  });
}
function lbRowHTML(r,i){
  return `<tr data-audit="${r.a.id}" onclick="go('audit',${r.a.id})">
    <td class="rank">${i+1}</td>
    <td><b>${esc(r.b.name)}</b><div class="qmeta">${esc(r.b.niche)} · ${r.cnt} audit${r.cnt>1?'s':''}</div></td>
    <td><span class="pf">${r.b.platform.toUpperCase()}</span></td>
    <td><span class="tierbadge ${r.t.cls}"><span class="tdot ${r.t.dcls}"></span>${r.t.name}</span></td>
    <td class="scorecell">${r.a.overall_score}</td>
    <td class="qmeta">${fmtDate(r.a.published_at)}</td>
  </tr>`;
}
function lbCardHTML(r,i){
  return `<div class="lb-card" data-audit="${r.a.id}" role="button" aria-label="View audit for ${esc(r.b.name)}">
    <div class="lb-card-top"><div><b>${esc(r.b.name)}</b><div class="lb-card-meta">${esc(r.b.niche)}</div></div><span class="rank">#${i+1}</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:8px">
      <span class="tierbadge ${r.t.cls}"><span class="tdot ${r.t.dcls}"></span>${r.t.name}</span>
      <span class="scorecell">${r.a.overall_score}</span>
    </div>
  </div>`;
}
function updateSortHeaders(){
  document.querySelectorAll('table.lb th[data-s]').forEach(th=>{
    const k=th.dataset.s;
    const active=lbSort.key===k;
    th.setAttribute('aria-sort',active?(lbSort.dir===1?'ascending':'descending'):'none');
    const arrow=active?(lbSort.dir===1?'\u2191':'\u2193'):'\u2195';
    let sortEl=th.querySelector('.sort');
    if(!sortEl){
      sortEl=document.createElement('span');
      sortEl.className='sort';
      sortEl.setAttribute('aria-hidden','true');
      th.appendChild(sortEl);
    }
    sortEl.textContent=arrow;
  });
}

async function load() {
  return loadState();
}

async function save(d?: typeof DB) {
  await saveState(d ?? DB, (message) => toast(message));
}

async function resetDB() {
  setDB(await loadState());
  toast("Reloaded server data");
  route();
}

/* =========================================================
   ROUTER
   ========================================================= */
let route_state={page:'home',param:null};
function go(page,param){route_state={page,param:param||null};location.hash=page+(param?('/'+param):'');route();}
window.addEventListener('hashchange',()=>{const h=location.hash.replace('#','');const[p,id]=h.split('/');if((p||'home')!==route_state.page||id!==route_state.param){route_state={page:p||'home',param:id||null};route();}});
function route(){
  const{page,param}=route_state;
  const isAdmin=page==='admin';
  document.getElementById('publicApp').classList.toggle('hidden',isAdmin);
  document.getElementById('adminApp').classList.toggle('hidden',!isAdmin);
  closeNavMenu();
  if(isAdmin){renderAdmin();return;}
  const v=document.getElementById('view');
  window.scrollTo(0,0);
  if(page==='home')v.innerHTML=viewHome();
  else if(page==='leaderboard')v.innerHTML=viewLeaderboard();
  else if(page==='methodology')v.innerHTML=viewMethodology();
  else if(page==='apply')v.innerHTML=viewApply();
  else if(page==='audit')v.innerHTML=viewAudit(parseInt(param));
  else if(page==='reaudit')v.innerHTML=viewReaudit(parseInt(param));
  else v.innerHTML=viewHome();
  if(page==='leaderboard')bindLeaderboard();
  bindTableRows();
}

/* =========================================================
   PUBLIC VIEWS
   ========================================================= */
function publishedAudits(){return DB.audits.filter(a=>a.status==='published');}
function latestAuditByBrand(){
  const map={};
  publishedAudits().forEach(a=>{if(!map[a.brand_id]||a.published_at>map[a.brand_id].published_at)map[a.brand_id]=a;});
  return Object.values(map);
}
function brand(id){return DB.brands.find(b=>b.id===id);}
function auditEvidence(id,dimId){
  const pins=DB.evidence_pins||[];
  return pins.filter(p=>p.audit_id===id&&(!dimId||p.dim_id===dimId)&&p.visibility!=='private');
}

function viewHome(){
  const audits=latestAuditByBrand().sort((a,b)=>b.overall_score-a.overall_score);
  const top=audits.slice(0,3);
  const queue=DB.applications.filter(a=>a.status==='pending'||a.status==='in_progress').length;
  return `
  <section class="hero"><div class="wrap">
    <span class="kicker">Independent · FB &amp; IG · since 2026</span>
    <h1>Your feed thinks it\u2019s good. <em>We decide.</em></h1>
    <p class="lede">The Accreditation is a third-party audit of brand presence on Facebook and Instagram, scored across 16 dimensions by real auditors, against published rubrics. Earn a tier. Wear the badge. Or get roasted.</p>
    <div class="herorow">
      <a href="#apply" class="btn acc"><i>\u25B8</i> Apply for an audit</a>
      <a href="#leaderboard" class="btn">View leaderboard</a>
    </div>
    <div class="facts">
      <p class="f"><b>${audits.length}</b> brands accredited</p>
      <p class="f"><b>16</b> dimensions scored</p>
      <p class="f"><b>${queue}</b> in the queue</p>
    </div>
  </div></section>

  <section><div class="wrap">
    <h2 class="big hero-size" style="margin-bottom:24px">Five outcomes. No participation trophies.</h2>
    <div class="tiers">
      ${TIERS.map(t=>`<div class="tier"><div class="dot ${t.dcls}">${t.name[0]}</div><h4>${t.name}</h4><p>${t.key==='roast'?'Below 60':t.min+(t.key==='plat'?'+':'\u2013'+(TIERS[TIERS.indexOf(t)-1]?TIERS[TIERS.indexOf(t)-1].min-1:99))}</p></div>`).join('')}
    </div>
  </div></section>

  <section style="padding-top:0"><div class="wrap">
    <h2 class="big hero-size" style="margin-bottom:24px">Currently leading</h2>
    <div class="lb-scroll"><table class="lb"><caption class="hidden">Top three brands on the leaderboard</caption><thead><tr><th scope="col">#</th><th scope="col">Brand</th><th scope="col">Platform</th><th scope="col">Tier</th><th scope="col">Score</th></tr></thead><tbody>
    ${top.length?top.map((a,i)=>{const b=brand(a.brand_id);const t=tierFor(a.overall_score);return `<tr data-audit="${a.id}" onclick="go('audit',${a.id})"><td class="rank">${i+1}</td><td><b>${esc(b.name)}</b><div class="qmeta">${esc(b.niche)}</div></td><td><span class="pf">${b.platform.toUpperCase()}</span></td><td><span class="tierbadge ${t.cls}"><span class="tdot ${t.dcls}"></span>${t.name}</span></td><td class="scorecell">${a.overall_score}</td></tr>`;}).join(''):`<tr><td colspan="5" class="empty">${ico('clipboard')}No published audits yet. New results will appear here after the first audit is published.</td></tr>`}
    </tbody></table></div>
    <div style="margin-top:18px"><a href="#leaderboard" class="btn sm">View full leaderboard</a></div>
  </div></section>

  <section style="padding-top:0"><div class="wrap">
    <h2 class="big hero-size" style="margin-bottom:24px">Four categories, sixteen dimensions</h2>
    <div class="catgrid">${DB.categories.map(c=>catCardHTML(c)).join('')}</div>
    <div style="margin-top:20px"><a href="#methodology" class="btn sm">Read full methodology</a></div>
  </div></section>`;
}
function catCardHTML(c){
  const dims=DB.dimensions.filter(d=>d.category_key===c.key);
  const w=activeWeights(DB,DB.weights_versions[DB.weights_versions.length-1].id);
  return `<div class="catcard"><div class="ch"><h3>${esc(c.name)}</h3><span class="wpill">${w[c.key]}% weight</span></div>
    <ul>${dims.map(d=>`<li><i>\u2192</i>${esc(d.name)}</li>`).join('')}</ul></div>`;
}

function viewLeaderboard(){
  return `<section><div class="wrap">
    <h2 class="big" style="margin-bottom:20px">Leaderboard</h2>
    <div class="lbcontrols">
      <input id="lbsearch" placeholder="Search brand\u2026" aria-label="Search brands" />
      <select id="lbtier" aria-label="Filter by tier"><option value="">All tiers</option>${TIERS.map(t=>`<option value="${t.key}">${t.name}</option>`).join('')}</select>
      <select id="lbplat" aria-label="Filter by platform"><option value="">All platforms</option><option value="ig">Instagram</option><option value="fb">Facebook</option></select>
    </div>
    <div class="lb-cards" id="lbcards"></div>
    <div class="lb-scroll"><table class="lb"><caption class="hidden">Brand accreditation leaderboard</caption><thead><tr>
      <th scope="col" data-s="rank">#</th><th scope="col" data-s="name">Brand</th><th scope="col" data-s="platform">Platform</th>
      <th scope="col" data-s="tier">Tier</th><th scope="col" data-s="score">Score</th><th scope="col" data-s="date">Last audit</th>
    </tr></thead><tbody id="lbbody"></tbody></table></div>
    <p class="qmeta" style="margin-top:14px">Click any row to read the full audit. Click a column header to sort.</p>
  </div></section>`;
}
let lbSort={key:'score',dir:-1};
function bindLeaderboard(){
  document.getElementById('lbsearch').addEventListener('input',renderLB);
  document.getElementById('lbtier').addEventListener('change',renderLB);
  document.getElementById('lbplat').addEventListener('change',renderLB);
  document.querySelectorAll('table.lb th[data-s]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.s;if(lbSort.key===k)lbSort.dir*=-1;else{lbSort={key:k,dir:k==='name'?1:-1};}renderLB();}));
  renderLB();
}
function renderLB(){
  const q=(document.getElementById('lbsearch').value||'').toLowerCase();
  const ft=document.getElementById('lbtier').value, fp=document.getElementById('lbplat').value;
  let rows=latestAuditByBrand().map(a=>{const b=brand(a.brand_id);const t=tierFor(a.overall_score);const cnt=publishedAudits().filter(x=>x.brand_id===a.brand_id).length;return{a,b,t,cnt};});
  rows=rows.filter(r=>(!q||r.b.name.toLowerCase().includes(q))&&(!ft||r.t.key===ft)&&(!fp||r.b.platform===fp));
  rows.sort((x,y)=>{let v;switch(lbSort.key){case'name':v=x.b.name.localeCompare(y.b.name);break;case'platform':v=x.b.platform.localeCompare(y.b.platform);break;case'tier':v=x.a.overall_score-y.a.overall_score;break;case'date':v=x.a.published_at-y.a.published_at;break;default:v=x.a.overall_score-y.a.overall_score;}return v*lbSort.dir;});
  const body=document.getElementById('lbbody');
  const cards=document.getElementById('lbcards');
  if(!rows.length){
    body.innerHTML=`<tr><td colspan="6" class="empty">${ico('empty')}No brands match your filters.</td></tr>`;
    if(cards)cards.innerHTML=`<div class="empty">${ico('empty')}No brands match your filters.</div>`;
    updateSortHeaders();
    return;
  }
  body.innerHTML=rows.map((r,i)=>lbRowHTML(r,i)).join('');
  if(cards)cards.innerHTML=rows.map((r,i)=>lbCardHTML(r,i)).join('');
  updateSortHeaders();
  bindTableRows();
}

function viewAudit(id){
  const a=DB.audits.find(x=>x.id===id&&x.status==='published');
  if(!a)return notFound('That audit isn\u2019t published (or doesn\u2019t exist).');
  const b=brand(a.brand_id);const t=tierFor(a.overall_score);
  const scores=DB.audit_scores[a.id]||[];
  const breakdown=catBreakdown(scores.map(s=>({dim_id:s.dim_id,score:s.score,note:s.note})),DB);
  const badge=location.origin+location.pathname+'#audit/'+a.id;
  const embed=`<a href="${badge}">\n  <img src="badge-${a.id}.svg" alt="The Accreditation \u2014 ${esc(b.name)}: ${t.name} ${a.overall_score}/100" width="220">\n</a>`;
  return `<section><div class="wrap">
    <a href="#leaderboard" class="btn ghost sm" style="margin-bottom:20px">\u2190 Back to leaderboard</a>
    <div class="auditgrid">
      <div>
        <div class="scorebox">
          <div class="top ${t.dcls}">
            <div class="bignum">${a.overall_score}</div>
            <div class="of">/ 100 · ${t.name.toUpperCase()}</div>
          </div>
          <div class="bod">
            <div class="meta"><span>Brand</span><b>${esc(b.name)}</b></div>
            <div class="meta"><span>Platform</span><span class="pf">${b.platform.toUpperCase()}</span></div>
            <div class="meta"><span>Handle</span><span class="mono">${esc(b.handle)}</span></div>
            <div class="meta"><span>Auditor</span><span>${esc(a.auditor)}</span></div>
            <div class="meta"><span>Date</span><span>${fmtDate(a.published_at)}</span></div>
            <div class="meta"><span>Rubric</span><span>v${a.rubric_version_id}</span></div>
            <a href="#reaudit/${a.id}" class="btn sm acc" style="width:100%;justify-content:center;margin-top:14px">Request re-audit</a>
            <div class="embed">
              <b style="font-size:12px;text-transform:uppercase;letter-spacing:.05em">Embed your badge</b>
              <div style="margin:10px 0">${badgeSVG(a,b,t,200)}</div>
              <code>${esc(embed)}</code>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h2 class="big" style="font-size:2rem;margin-bottom:6px">${esc(b.name)}</h2>
        <p class="qmeta" style="font-size:15px;margin-bottom:8px">${esc(b.niche)} · <span class="mono">${esc(b.handle)}</span></p>
        <p style="font-size:16px;margin-bottom:24px;max-width:60ch;text-wrap:pretty">${esc(a.summary)}</p>
        ${breakdown.map(bd=>{
          const w=activeWeights(DB,a.weights_version_id||1)[bd.cat.key];
          return `<div class="catblock"><div class="cbh"><h3>${esc(bd.cat.name)} <span class="mono" style="font-size:12px;color:var(--txt3)">${w}% wt</span></h3><div class="cbs">${bd.avg.toFixed(1)}/10</div></div>
          ${bd.rows.map(r=>{const ev=auditEvidence(a.id,r.dim.id);return `<div class="dimrow"><div class="dimtop"><span class="dn">${esc(r.dim.name)}</span><span class="ds">${r.score}/10</span></div><div class="bar"><i style="--pct:${r.score/10}"></i></div>${r.note?`<div class="dimnote">\u201c${esc(r.note)}\u201d</div>`:''}${ev.length?`<div class="evlist">${ev.map((p,i)=>`<div class="evitem"><div class="evtop"><span>Evidence #${i+1}</span><span>${esc(p.visibility)}</span></div><p>${esc(p.note)}</p>${p.element_text?`<div class="evt">${esc(p.element_text)}</div>`:''}</div>`).join('')}</div>`:''}</div>`;}).join('')}
          </div>`;}).join('')}
      </div>
    </div>
  </div></section>`;
}

function viewMethodology(){
  const av=DB.rubric_anchors[1];
  return `<section><div class="wrap">
    <h2 class="big" style="margin-bottom:8px">How the score is built</h2>
    <p class="page-lede">Every brand is scored on 16 dimensions, each 1 to 10, against the published anchors below. Dimensions roll up into four weighted categories, then into a single 0 to 100 score and a tier. Each audit records the rubric version it used, so older audits stay reproducible.</p>
    ${DB.categories.map(c=>{
      const dims=DB.dimensions.filter(d=>d.category_key===c.key);
      const w=activeWeights(DB,DB.weights_versions[DB.weights_versions.length-1].id)[c.key];
      return `<h3 style="font-size:1.5rem;margin:28px 0 12px">${esc(c.name)} <span class="wpill" style="vertical-align:middle">${w}% of final</span></h3>
      ${dims.map(d=>{const a=av[d.id];return `<details class="methrow"><summary><span>${esc(d.name)} <span class="qmeta" style="font-weight:500">(${esc(d.description)})</span></span><span class="cat">1 · 5 · 10</span></summary>
        <div class="anchors">
          <div class="ar"><span class="al">Score 1</span><span class="av">${esc(a.anchor_1)}</span></div>
          <div class="ar"><span class="al">Score 5</span><span class="av">${esc(a.anchor_5)}</span></div>
          <div class="ar"><span class="al">Score 10</span><span class="av">${esc(a.anchor_10)}</span></div>
        </div></details>`;}).join('')}`;
    }).join('')}
  </div></section>`;
}

function viewApply(){
  return `<section><div class="wrap">
    <h2 class="big" style="margin-bottom:8px">Submit your brand for audit</h2>
    <p class="page-lede" style="max-width:58ch">No account needed. We will review your application, run the 16-dimension audit, and publish a permanent, embeddable result, whatever the score.</p>
    <div id="applyNotice" aria-live="polite"></div>
    <div class="form" id="applyForm">
      <div class="field"><label for="ap_name">Brand name</label><input id="ap_name" placeholder="e.g. Your Brand"></div>
      <div class="field"><label for="ap_plat">Platform</label><select id="ap_plat"><option value="ig">Instagram</option><option value="fb">Facebook</option></select></div>
      <div class="field"><label for="ap_url">Profile URL</label><input id="ap_url" placeholder="https://instagram.com/yourbrand"><div class="hint">Must be a facebook.com or instagram.com link.</div></div>
      <div class="field"><label for="ap_email">Contact email</label><input id="ap_email" type="email" placeholder="you@brand.com"></div>
      <div class="field"><label for="ap_niche">Niche</label><input id="ap_niche" placeholder="e.g. D2C skincare"></div>
      <div class="field"><label for="ap_why">Why do you want the accreditation?</label><textarea id="ap_why" placeholder="Tell us what you are hoping it proves…"></textarea></div>
      <input class="hp" id="ap_hp" tabindex="-1" autocomplete="off" placeholder="leave blank">
      <button type="button" class="btn acc" id="applyBtn" onclick="submitApply()"><i>\u25B8</i> Submit application</button>
    </div>
  </div></section>`;
}
async function submitApply(){
  const n=val('ap_name'),plat=val('ap_plat'),url=val('ap_url'),email=val('ap_email'),niche=val('ap_niche'),why=val('ap_why'),hp=val('ap_hp');
  const note=document.getElementById('applyNotice');
  const btn=document.getElementById('applyBtn');
  if(hp){note.innerHTML='';return;}
  const errs=[];
  if(n.length<2||n.length>80)errs.push('Brand name looks off.');
  if(!/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i.test(url))errs.push('Profile URL must be a facebook.com or instagram.com link.');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))errs.push('Enter a valid email.');
  if(niche.length<2)errs.push('Tell us your niche.');
  if(why.length<10)errs.push('Give us a sentence on why you want it.');
  if(errs.length){note.innerHTML=errNotice(errs);return;}
  setBtnLoading(btn,true);
  try{
    const res=await apiJSON('/api/applications',{method:'POST',body:JSON.stringify({brandName:n,platform:plat,url,email,niche,why,honeypot:hp})});
    if(res.state)setDB(res.state);
    document.getElementById('applyForm').innerHTML=`<div class="notice ok">${ico('check')} Application received for <b>${esc(n)}</b>. It is now in the audit queue. Watch your inbox at ${esc(email)}.</div><a href="#leaderboard" class="btn sm">View leaderboard</a>`;
  }catch(e){
    note.innerHTML=errNotice((e.errors)||['Could not submit application.']);
    setBtnLoading(btn,false);
  }
}

function viewReaudit(id){
  const a=DB.audits.find(x=>x.id===id&&x.status==='published');
  if(!a)return notFound('Can\u2019t request a re-audit for that.');
  const b=brand(a.brand_id);
  const days=Math.floor((Date.now()-a.published_at)/86400000);
  const eligible=days>=30;
  return `<section><div class="wrap">
    <a href="#audit/${id}" class="btn ghost sm" style="margin-bottom:18px">\u2190 Back to audit</a>
    <h2 class="big" style="margin-bottom:8px">Request a re-audit for ${esc(b.name)}</h2>
    <p class="qmeta" style="margin-bottom:8px">Current: ${a.overall_score}/100 (${tierFor(a.overall_score).name}), audited ${days} day${days===1?'':'s'} ago.</p>
    ${!eligible?`<div class="notice err" style="max-width:600px">${ico('clock')} Re-audits open 30 days after the last publish. You can request again in ${30-days} day${30-days===1?'':'s'}.</div>`:''}
    <div id="raNotice" aria-live="polite"></div>
    <div class="form" id="raForm" style="${!eligible?'opacity:.45;pointer-events:none':''}">
      <div class="field"><label for="ra_email">Contact email (must match the original)</label><input id="ra_email" type="email" placeholder="${esc(b.contact_email)}"></div>
      <div class="field"><label for="ra_note">What did you change?</label><textarea id="ra_note" placeholder="Walk us through what has improved since the last audit…"></textarea><div class="hint">Required. We will not re-score a feed that has not changed.</div></div>
      <button type="button" class="btn acc" id="raBtn" onclick="submitReaudit(${id})"><i>\u25B8</i> Request re-audit</button>
    </div>
  </div></section>`;
}
async function submitReaudit(id){
  const a=DB.audits.find(x=>x.id===id);const b=brand(a.brand_id);
  const email=val('ra_email'),note=val('ra_note');const out=document.getElementById('raNotice');
  const btn=document.getElementById('raBtn');
  const errs=[];
  if((Date.now()-a.published_at)/86400000<30)errs.push('Too soon: 30-day cooldown applies.');
  if(email.trim().toLowerCase()!==b.contact_email.toLowerCase())errs.push('Email must match the one on the original audit.');
  if(note.trim().length<15)errs.push('Tell us what changed (a real sentence).');
  if(errs.length){out.innerHTML=errNotice(errs);return;}
  setBtnLoading(btn,true);
  try{
    const res=await apiJSON('/api/reaudits',{method:'POST',body:JSON.stringify({auditId:id,email,changesNote:note})});
    if(res.state)setDB(res.state);
    document.getElementById('raForm').innerHTML=`<div class="notice ok">${ico('check')} Re-audit requested for <b>${esc(b.name)}</b>. It is back in the queue.</div>`;
  }catch(e){
    out.innerHTML=errNotice((e.errors)||['Could not request re-audit.']);
    setBtnLoading(btn,false);
  }
}

function notFound(msg){return `<section><div class="wrap" style="text-align:center;padding:80px 0"><h2 class="big">404</h2><p class="page-lede" style="margin:10px auto 24px">${esc(msg)}</p><a href="#home" class="btn">\u2190 Home</a></div></section>`;}

/* badge SVG (also the embeddable asset) */
function badgeSVG(a,b,t,w){
  const h=Math.round(w*0.42);
  return `<svg width="${w}" height="${h}" viewBox="0 0 220 92" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Accreditation badge">
    <rect x="1" y="1" width="218" height="90" rx="16" fill="#0a0b0d" stroke="#26282e" stroke-width="1.5"/>
    <circle cx="47" cy="46" r="27" fill="none" stroke="${t.col}" stroke-width="2.5" opacity="0.35"/>
    <circle cx="47" cy="46" r="27" fill="none" stroke="${t.col}" stroke-width="2.5" stroke-dasharray="${Math.round(a.overall_score/100*170)} 999" stroke-linecap="round" transform="rotate(-90 47 46)"/>
    <text x="47" y="49" text-anchor="middle" font-family="Geist,system-ui,sans-serif" font-weight="600" font-size="23" fill="#f2f3f5">${a.overall_score}</text>
    <text x="86" y="33" font-family="Geist Mono,monospace" font-size="7.5" letter-spacing="1.5" fill="#6b6f7a">THE ACCREDITATION</text>
    <text x="86" y="53" font-family="Geist,system-ui,sans-serif" font-weight="600" font-size="17" letter-spacing="-0.5" fill="${t.col}">${t.name}</text>
    <text x="86" y="69" font-family="Geist,system-ui,sans-serif" font-size="9" fill="#a4a8b2">${esc(b.name).slice(0,24)} \u00b7 #${a.id}</text>
  </svg>`;
}

/* =========================================================
   ADMIN
   ========================================================= */
let adminState={auth:false,user:'Roaster',page:'queue',editing:null,scores:{},rubricDraft:null};
function renderAdmin(){
  const app=document.getElementById('adminApp');
  if(!adminState.auth){app.innerHTML=loginScreen();return;}
  app.innerHTML=`
  <div class="admin-wrap">
    <aside class="adminbar" style="position:relative" aria-label="Admin navigation">
      <div class="ab-brand"><span class="seal">A</span> The Accreditation</div>
      <div class="ab-sub">AUDIT BUREAU · ADMIN</div>
      ${[['queue','inbox','Queue'],['editor','adjustments','Audit editor'],['rubric','ruler','Rubric manager'],['weights','scale','Weights'],['users','users','Users']].map(n=>`<button type="button" class="navi ${adminState.page===n[0]?'on':''}" onclick="adminGo('${n[0]}')" aria-label="${n[2]}">${ico(n[1])}<span>${n[2]}</span></button>`).join('')}
      <button type="button" class="navi" onclick="go('home')" aria-label="View public site">${ico('external')}<span>View public site</span></button>
      <button type="button" class="navi" onclick="adminLogout()" aria-label="Log out">${ico('logout')}<span>Log out</span></button>
      <div class="who">Signed in as ${adminState.user}</div>
    </aside>
    <main class="admin-main" id="adminMain">${adminBody()}</main>
  </div>`;
  if(adminState.page==='editor')bindEditor();
}
function loginScreen(){
  return `<div class="login-screen"><div class="login-card">
    <div class="brand" style="font-size:20px;margin-bottom:6px"><span class="seal">A</span> The Accreditation</div>
    <p class="qmeta" style="margin-bottom:22px">Auditor and admin sign-in</p>
    <div id="loginErr" aria-live="polite"></div>
    <div class="field"><label for="lg_user">Username</label><input id="lg_user" placeholder="Username" autocomplete="username"></div>
    <div class="field"><label for="lg_pass">Password</label><input id="lg_pass" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="current-password"></div>
    <button type="button" class="btn acc" id="loginBtn" style="width:100%;justify-content:center" onclick="adminLogin()"><i>\u25B8</i> Sign in</button>
    <p style="text-align:center;margin-top:8px"><a href="#home" class="mono" style="font-size:12px">\u2190 Back to public site</a></p>
  </div></div>`;
}
async function adminLogin(){
  const u=val('lg_user'),p=val('lg_pass');
  const btn=document.getElementById('loginBtn');
  setAdminCredentials({user:u,pass:p});
  setBtnLoading(btn,true,'Signing in…');
  try{
    await apiJSON('/api/admin/login',{method:'POST',headers:authHeader(),body:'{}'});
    adminState.auth=true;adminState.user=u||'Roaster';renderAdmin();
  }catch(e){
    setAdminCredentials(null);
    setBtnLoading(btn,false);
    document.getElementById('loginErr').innerHTML=errNotice(['Wrong credentials.']);
  }
}
function adminLogout(){adminState.auth=false;setAdminCredentials(null);renderAdmin();}
function adminGo(p){adminState.page=p;if(p==='editor'&&!adminState.editing)adminState.editing=null;renderAdmin();}

function adminBody(){
  switch(adminState.page){
    case'queue':return adminQueue();
    case'editor':return adminEditor();
    case'rubric':return adminRubric();
    case'weights':return adminWeights();
    case'users':return adminUsers();
  }
}

/* QUEUE */
function adminQueue(){
  const apps=[...DB.applications].sort((a,b)=>b.created_at-a.created_at);
  const pending=apps.filter(a=>a.status==='pending'||a.status==='in_progress');
  return `<div class="ah"><h2>Queue</h2><span class="qmeta">${pending.length} awaiting action · ${apps.length} total</span></div>
  ${['pending','in_progress','completed','rejected'].map(st=>{
    const list=apps.filter(a=>a.status===st);
    if(!list.length)return'';
    return `<h3 class="ed-cat-h">${st.replace('_',' ')} (${list.length})</h3><div class="card">${list.map(ap=>{const b=brand(ap.brand_id);return `
      <div class="qrow">
        <div>
          <div style="font-weight:700;font-size:15px">${esc(b.name)} <span class="stag s-${ap.type}">${ap.type}</span></div>
          <div class="qmeta">${esc(b.niche)} · <span class="pf" style="font-size:10px">${b.platform.toUpperCase()}</span> · ${esc(b.handle)} · ${fmtDate(ap.created_at)}</div>
          ${ap.why?`<div class="qmeta" style="margin-top:4px;font-style:italic">\u201c${esc(ap.why)}\u201d</div>`:''}
          ${ap.changes_note?`<div class="qmeta" style="margin-top:4px;font-style:italic">Changes: \u201c${esc(ap.changes_note)}\u201d</div>`:''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="stag s-${ap.status}">${ap.status.replace('_',' ')}</span>
          ${ap.status!=='completed'&&ap.status!=='rejected'?`
            <button type="button" class="btn sm" onclick="claimAndScore(${ap.id})">${ico('adjustments')} Audit now</button>
            <button type="button" class="btn sm ghost" onclick="rejectApp(${ap.id})">Reject application</button>`:''}
        </div>
      </div>`;}).join('')}</div>`;
  }).join('')}
  ${!apps.length?`<div class="empty">${ico('inbox')}Queue empty. Applications appear here after someone submits the public form.</div>`:''}`;
}
async function claimAndScore(appId){
  const ap=DB.applications.find(a=>a.id===appId);ap.status='in_progress';ap.claimed_by=adminState.user;await save();
  startAudit(ap.brand_id,appId);
}
async function rejectApp(appId){
  const r=prompt('Reason for rejection?');if(r===null)return;
  const ap=DB.applications.find(a=>a.id===appId);ap.status='rejected';ap.reject_reason=r;await save();toast('Application rejected');renderAdmin();
}

/* AUDIT EDITOR */
function startAudit(brandId,appId){
  adminState.editing={brandId,appId,rubric:DB.rubric_versions[DB.rubric_versions.length-1].id,weights:DB.weights_versions[DB.weights_versions.length-1].id,summary:'',auditId:null};
  adminState.scores={};DB.dimensions.forEach(d=>adminState.scores[d.id]={score:5,note:''});
  adminState.page='editor';renderAdmin();
}
function adminEditor(){
  if(!adminState.editing){
    const completed=DB.audits.filter(a=>a.status==='published');
    const pend=DB.applications.filter(a=>a.status==='pending'||a.status==='in_progress');
    return `<div class="ah"><h2>Audit editor</h2></div>
    <div class="card"><p style="font-weight:600;margin-bottom:14px">Pick something from the queue to score:</p>
    ${pend.length?pend.map(ap=>{const b=brand(ap.brand_id);return `<div class="qrow"><div><b>${esc(b.name)}</b> <span class="stag s-${ap.type}">${ap.type}</span><div class="qmeta">${esc(b.niche)}</div></div><button type="button" class="btn sm" onclick="claimAndScore(${ap.id})">Score brand</button></div>`;}).join(''):`<div class="empty">${ico('checkbox')}Nothing waiting. Add one via the public Apply form.</div>`}
    </div>`;
  }
  const{brandId}=adminState.editing;const b=brand(brandId);
  const anchors=DB.rubric_anchors[adminState.editing.rubric];
  return `<div class="ah"><h2>Scoring: ${esc(b.name)}</h2><button class="btn sm ghost" onclick="cancelEdit()">\u2190 Back to queue</button></div>
  <div class="editgrid">
    <div>
      ${DB.categories.map(c=>{
        const dims=DB.dimensions.filter(d=>d.category_key===c.key);
        return `<div class="ed-cat-h">${esc(c.name)}</div>${dims.map(d=>{const a=anchors[d.id];const sc=adminState.scores[d.id];return `
          <div class="ed-dim">
            <div class="edt"><span class="ednm">${esc(d.name)}</span><span class="edsc" id="sc_${d.id}">${sc.score}</span></div>
            <input type="range" min="1" max="10" step="1" value="${sc.score}" oninput="setScore(${d.id},this.value)">
            <div class="anchortxt" id="anc_${d.id}">${anchorFor(a,sc.score)}</div>
            <textarea placeholder="Note (optional, shows on the public audit)" oninput="setNote(${d.id},this.value)">${esc(sc.note)}</textarea>
          </div>`;}).join('')}`;
      }).join('')}
      <div class="ed-dim"><div class="edt"><span class="ednm">Overall summary</span></div><textarea id="ed_summary" placeholder="One-paragraph verdict shown at the top of the public audit\u2026" oninput="adminState.editing.summary=this.value" style="min-height:70px">${esc(adminState.editing.summary)}</textarea></div>
    </div>
    <div>
      <div class="scorepreview">
        <div class="qmeta" style="text-transform:uppercase;letter-spacing:.08em;font-size:11px">Live score</div>
        <div class="pn" id="pv_num">\u2014</div>
        <div id="pv_tier" style="margin:6px 0 14px"></div>
        <div id="pv_cats" style="text-align:left"></div>
        <button type="button" class="btn sm" id="draftBtn" style="width:100%;justify-content:center;margin-top:14px" onclick="saveDraft()">${ico('save')} Save draft</button>
        <button type="button" class="btn sm acc" id="publishBtn" style="width:100%;justify-content:center;margin-top:8px" onclick="publishAudit()">${ico('rocket')} Publish audit</button>
        <p class="qmeta" style="margin-top:10px;font-size:11px">Publishing freezes the score + rubric v${adminState.editing.rubric} and creates the public page.</p>
      </div>
    </div>
  </div>`;
}
function anchorFor(a,score){
  let lab,txt;
  if(score<=3){lab='1';txt=a.anchor_1;} else if(score<=7){lab='5';txt=a.anchor_5;} else {lab='10';txt=a.anchor_10;}
  return `<b>Anchor ${lab}:</b> ${esc(txt)}`;
}
function bindEditor(){updatePreview();}
function setScore(id,v){adminState.scores[id].score=parseInt(v);document.getElementById('sc_'+id).textContent=v;const a=DB.rubric_anchors[adminState.editing.rubric][id];document.getElementById('anc_'+id).innerHTML=anchorFor(a,parseInt(v));updatePreview();}
function setNote(id,v){adminState.scores[id].note=v;}
function updatePreview(){
  const arr=Object.entries(adminState.scores).map(([id,s])=>({dim_id:parseInt(id),score:s.score}));
  const overall=computeOverall(arr,DB,adminState.editing.rubric,adminState.editing.weights);
  const t=tierFor(overall);
  document.getElementById('pv_num').textContent=overall;
  document.getElementById('pv_num').style.color=t.col;
  document.getElementById('pv_tier').innerHTML=`<span class="tierbadge ${t.cls}"><span class="tdot ${t.dcls}"></span>${t.name}</span>`;
  const bd=catBreakdown(arr.map(x=>({dim_id:x.dim_id,score:x.score})),DB);
  document.getElementById('pv_cats').innerHTML=bd.map(b=>`<div class="pv-catrow"><span>${esc(b.cat.name)}</span><span class="mono" style="font-weight:700;color:var(--txt)">${b.avg.toFixed(1)}</span></div>`).join('');
}
function cancelEdit(){adminState.editing=null;adminState.page='queue';renderAdmin();}
function buildAudit(status){
  const e=adminState.editing;const arr=Object.entries(adminState.scores).map(([id,s])=>({dim_id:parseInt(id),score:s.score,note:s.note}));
  const overall=computeOverall(arr.map(x=>({dim_id:x.dim_id,score:x.score})),DB,e.rubric,e.weights);
  let aud=e.auditId?DB.audits.find(a=>a.id===e.auditId):null;
  if(!aud){aud={id:DB.nextId++,brand_id:e.brandId,auditor:adminState.user,rubric_version_id:e.rubric,weights_version_id:e.weights,created_at:Date.now()};DB.audits.push(aud);e.auditId=aud.id;}
  aud.status=status;aud.overall_score=overall;aud.tier=tierFor(overall).key;aud.summary=e.summary||'Audited across all 16 dimensions.';
  if(status==='published')aud.published_at=Date.now();
  DB.audit_scores[aud.id]=arr;
  if(status==='published'&&e.appId){const ap=DB.applications.find(a=>a.id===e.appId);if(ap)ap.status='completed';}
  return aud;
}
async function saveDraft(){buildAudit('draft');await save();toast('Draft saved');}
async function publishAudit(){
  const btn=document.getElementById('publishBtn');
  setBtnLoading(btn,true,'Publishing…');
  try{
    const aud=buildAudit('published');await save();adminState.editing=null;adminState.page='queue';toast('Published. Public audit is live.');renderAdmin();setTimeout(()=>go('audit',aud.id),400);
  }catch(e){
    setBtnLoading(btn,false);
  }
}

/* RUBRIC MANAGER */
function adminRubric(){
  if(!adminState.rubricDraft){
    const cur=DB.rubric_versions[DB.rubric_versions.length-1].id;
    adminState.rubricDraft=JSON.parse(JSON.stringify({dims:DB.dimensions,anchors:DB.rubric_anchors[cur]}));
    adminState.rubricBase=cur;
  }
  const d=adminState.rubricDraft;
  return `<div class="ah"><h2>Rubric manager</h2><span class="qmeta">Editing from v${adminState.rubricBase} \u00b7 ${DB.rubric_versions.length} version(s)</span></div>
  <div class="notice">${ico('info')} Saving creates a <b>new rubric version</b>. Existing audits keep the version they were scored on.</div>
  ${DB.categories.map(c=>{
    const dims=d.dims.filter(x=>x.category_key===c.key);
    return `<h3 class="ed-cat-h">${esc(c.name)}</h3><div class="card">${dims.map(dim=>{const a=d.anchors[dim.id];return `
      <div class="rm-row">
        <input value="${esc(dim.name)}" onchange="rmEdit(${dim.id},'name',this.value)" style="font-weight:700">
        <input value="${esc(dim.description)}" onchange="rmEdit(${dim.id},'description',this.value)" placeholder="description">
        <div class="rm-anchors">
          <textarea onchange="rmAnchor(${dim.id},'anchor_1',this.value)" placeholder="Anchor 1">${esc(a.anchor_1)}</textarea>
          <textarea onchange="rmAnchor(${dim.id},'anchor_5',this.value)" placeholder="Anchor 5">${esc(a.anchor_5)}</textarea>
          <textarea onchange="rmAnchor(${dim.id},'anchor_10',this.value)" placeholder="Anchor 10">${esc(a.anchor_10)}</textarea>
        </div>
      </div>`;}).join('')}</div>`;
  }).join('')}
  <button type="button" class="btn acc" onclick="saveRubric()">${ico('save')} Save as new version</button>
  <button type="button" class="btn ghost" onclick="adminState.rubricDraft=null;renderAdmin()">Discard changes</button>`;
}
function rmEdit(id,f,v){const dim=adminState.rubricDraft.dims.find(x=>x.id===id);dim[f]=v;}
function rmAnchor(id,f,v){adminState.rubricDraft.anchors[id][f]=v;}
async function saveRubric(){
  const newId=DB.rubric_versions.length+1;
  DB.rubric_versions.push({id:newId,created_at:Date.now(),notes:'Edited from v'+adminState.rubricBase});
  DB.dimensions=adminState.rubricDraft.dims;
  DB.rubric_anchors[newId]=JSON.parse(JSON.stringify(adminState.rubricDraft.anchors));
  adminState.rubricDraft=null;await save();toast('Rubric v'+newId+' saved');renderAdmin();
}

/* WEIGHTS MANAGER */
function adminWeights(){
  const w=activeWeights(DB,DB.weights_versions[DB.weights_versions.length-1].id);
  return `<div class="ah"><h2>Weights</h2><span class="qmeta">Affects new audits only</span></div>
  <div class="card" style="max-width:480px">
    ${DB.categories.map(c=>`<div class="wgt-row"><span class="wn">${esc(c.name)}</span><input type="number" min="0" max="100" id="wt_${c.key}" value="${w[c.key]}" oninput="wtotal()"></div>`).join('')}
    <div class="wtotal" id="wtot">Total: 100%</div>
    <button type="button" class="btn acc" style="margin-top:14px" onclick="saveWeights()">${ico('save')} Save weights</button>
  </div>`;
}
function wtotal(){const t=DB.categories.reduce((s,c)=>s+(parseInt(val('wt_'+c.key))||0),0);const el=document.getElementById('wtot');el.textContent='Total: '+t+'%'+(t!==100?' (should be 100)':'');el.style.color=t===100?'var(--acc2)':'var(--roast)';}
async function saveWeights(){
  const w={};let t=0;DB.categories.forEach(c=>{w[c.key]=parseInt(val('wt_'+c.key))||0;t+=w[c.key];});
  if(t!==100){toast('Weights must total 100');return;}
  const id=DB.weights_versions.length+1;DB.weights_versions.push({id,weights:w});
  DB.categories.forEach(c=>c.weight=w[c.key]);await save();toast('Weights v'+id+' saved');renderAdmin();
}

/* USERS */
function adminUsers(){
  const users=DB.users||(DB.users=[{name:'Roaster',role:'admin',email:'roaster@accreditation.io'}]);
  return `<div class="ah"><h2>Users</h2></div>
  <div class="card">${users.map((u,i)=>`<div class="qrow"><div><b>${esc(u.name)}</b> <span class="stag s-completed">${u.role}</span><div class="qmeta">${esc(u.email)}</div></div>${u.role!=='admin'?`<button class="btn sm ghost" onclick="rmUser(${i})">Remove</button>`:'<span class="qmeta">owner</span>'}</div>`).join('')}</div>
  <h3 class="ed-cat-h">Invite a co-auditor</h3>
  <div class="card" style="max-width:480px">
    <div class="field"><label>Name</label><input id="us_name" placeholder="Jane Auditor"></div>
    <div class="field"><label>Email</label><input id="us_email" placeholder="jane@\u2026"></div>
    <button type="button" class="btn acc" onclick="addUser()">${ico('userplus')} Send invite</button>
  </div>`;
}
async function addUser(){const n=val('us_name'),e=val('us_email');if(n.length<2||!/.+@.+\..+/.test(e)){toast('Enter a name and valid email');return;}DB.users.push({name:n,role:'auditor',email:e});await save();toast('Invited '+n);renderAdmin();}
async function rmUser(i){DB.users.splice(i,1);await save();renderAdmin();}

/* =========================================================
   UTIL
   ========================================================= */
function val(id){const e=document.getElementById(id);return e?e.value.trim():'';}
function handleFrom(url){try{const p=new URL(url).pathname.replace(/\//g,'');return (url.includes('instagram')?'@':'')+(p||'profile');}catch(e){return 'profile';}}
let toastT;function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1900);}

const appWindow = window as typeof window & {
  go: typeof go;
  submitApply: typeof submitApply;
  submitReaudit: typeof submitReaudit;
  adminLogin: typeof adminLogin;
  adminLogout: typeof adminLogout;
  adminGo: typeof adminGo;
  claimAndScore: typeof claimAndScore;
  rejectApp: typeof rejectApp;
  setScore: typeof setScore;
  setNote: typeof setNote;
  saveDraft: typeof saveDraft;
  publishAudit: typeof publishAudit;
  cancelEdit: typeof cancelEdit;
  rmEdit: typeof rmEdit;
  rmAnchor: typeof rmAnchor;
  saveRubric: typeof saveRubric;
  saveWeights: typeof saveWeights;
  addUser: typeof addUser;
  rmUser: typeof rmUser;
  wtotal: typeof wtotal;
  resetDB: typeof resetDB;
  adminState: typeof adminState;
};

appWindow.go = go;
appWindow.submitApply = submitApply;
appWindow.submitReaudit = submitReaudit;
appWindow.adminLogin = adminLogin;
appWindow.adminLogout = adminLogout;
appWindow.adminGo = adminGo;
appWindow.claimAndScore = claimAndScore;
appWindow.rejectApp = rejectApp;
appWindow.setScore = setScore;
appWindow.setNote = setNote;
appWindow.saveDraft = saveDraft;
appWindow.publishAudit = publishAudit;
appWindow.cancelEdit = cancelEdit;
appWindow.rmEdit = rmEdit;
appWindow.rmAnchor = rmAnchor;
appWindow.saveRubric = saveRubric;
appWindow.saveWeights = saveWeights;
appWindow.addUser = addUser;
appWindow.rmUser = rmUser;
appWindow.wtotal = wtotal;
appWindow.resetDB = resetDB;
appWindow.adminState = adminState;

/* init */
(async function(){
  try{
    bindNav();
    setDB(await load());
    const h=location.hash.replace('#','');const[p,id]=h.split('/');
    route_state={page:p||'home',param:id||null};route();
  }catch(e){
    document.body.innerHTML='<div style="font-family:system-ui,sans-serif;padding:32px;color:#f2f3f5;background:#0a0b0d;min-height:100vh">Could not load Accreditation data. Please refresh or check the server.</div>';
  }
})();
