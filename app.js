// app.js - client-side app storing content in localStorage
// Data model:
// storage key 'modapk_data' => { mods: [...], books: {cat: [...]}, configs: [...] , views: {id:views} }

(function(){
  const STORAGE_KEY = 'modapk_data_v1';
  const ADMIN_PASSWORD = '@gmail.com/Prince7488'; // client-side demo password (insecure for production)

  const defaultData = { mods: [], books: { '10th':[], '11th-jee':[], '11th-neet':[], '12th-jee':[], '12th-neet':[] }, configs: [], views: {} };

  function load(){ try{ const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); return d || JSON.parse(JSON.stringify(defaultData)); }catch(e){ return JSON.parse(JSON.stringify(defaultData)); } }
  function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

  // Admin helpers to handle images uploaded as data URLs
  function fileToDataUrl(file){ return new Promise((res, rej)=>{ const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }

  // Render functions used by pages
  window.renderMods = function(filter=''){
    const data = load();
    const grid = document.getElementById('modsGrid') || document.getElementById('cards');
    if(!grid) return;
    grid.innerHTML = '';
    const list = data.mods.filter(m => (m.title + ' ' + (m.tags||'')).toLowerCase().includes(filter||''));
    if(list.length===0){ grid.innerHTML = '<div class="card">No mods yet. Add from Admin panel.</div>'; return; }
    list.forEach(m=>{
      const el = document.createElement('div'); el.className='card';
      el.innerHTML = `<div style="display:flex;gap:10px;align-items:center">
        <div style="width:64px;height:64px;border-radius:8px;overflow:hidden;background:#111;flex:0 0 64px">
          ${m.image?'<img src="'+m.image+'" style="width:100%;height:100%;object-fit:cover">':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888">APK</div>'}
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escapeHtml(m.title)}</strong>
            <div style="font-size:13px;opacity:0.9">${m.size || ''}</div>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <a class="btn small" href="${m.link||'#'}" download>Download</a>
            <button class="btn small" onclick="window.incrementView('${m.id}')">Open</button>
            <span style="opacity:0.85;margin-left:6px">Views: ${getViews(m.id)}</span>
          </div>
        </div>
      </div>`;
      grid.appendChild(el);
    });
  };

  window.renderBooks = function(cat, filter=''){
    const data = load();
    const grid = document.getElementById('booksGrid') || document.getElementById('cards');
    if(!grid) return;
    grid.innerHTML='';
    const list = (data.books[cat]||[]).filter(b => (b.title + ' ' + (b.tags||'')).toLowerCase().includes(filter||''));
    if(list.length===0){ grid.innerHTML = '<div class="card">No books found in this category. Add via Admin.</div>'; return; }
    list.forEach(b=>{
      const el = document.createElement('div'); el.className='card';
      el.innerHTML = `<strong>${escapeHtml(b.title)}</strong>
        <div style="margin-top:8px">
          <a class="btn small" href="${b.link||'#'}" download>Download</a>
          <span style="opacity:0.9;margin-left:10px">Views: ${getViews(b.id)}</span>
        </div>`;
      grid.appendChild(el);
    });
  };

  window.renderConfigs = function(filter=''){
    const data = load();
    const grid = document.getElementById('configsGrid') || document.getElementById('cards');
    if(!grid) return;
    grid.innerHTML='';
    const list = data.configs.filter(c => (c.title + ' ' + (c.tags||'')).toLowerCase().includes(filter||''));
    if(list.length===0){ grid.innerHTML = '<div class="card">No configs yet. Add via Admin.</div>'; return; }
    list.forEach(c=>{
      const el = document.createElement('div'); el.className='card';
      el.innerHTML = `<strong>${escapeHtml(c.title)}</strong>
        <div style="margin-top:8px">
          <a class="btn small" href="${c.link||'#'}" target="_blank">Open Link</a>
        </div>`;
      grid.appendChild(el);
    });
  };

  window.showHomeCards = function(q=''){
    // show some highlights from each category
    const data = load();
    const grid = document.getElementById('cards');
    if(!grid) return;
    grid.innerHTML='';
    const items = []
      .concat(data.mods.slice(0,6))
      .concat(Object.keys(data.books).map(k=>({title:k.toUpperCase(), isCat:true, id:k})))
      .concat(data.configs.slice(0,6));
    items.forEach(it=>{
      const el = document.createElement('div'); el.className='card';
      if(it.isCat){
        el.innerHTML = `<strong>${escapeHtml(it.title)}</strong><div style="margin-top:8px"><a class="btn small" href="books.html">Open</a></div>`;
      } else {
        el.innerHTML = `<strong>${escapeHtml(it.title)}</strong><div style="margin-top:8px"><a class="btn small" href="#">Open</a></div>`;
      }
      grid.appendChild(el);
    });
  };

  // views
  function getViews(id){ const d = load(); return d.views && d.views[id] ? d.views[id] : 0; }
  window.incrementView = function(id){ const d = load(); d.views[id] = (d.views[id]||0) + 1; save(d); window.renderMods(''); window.renderBooks('10th',''); window.renderConfigs(''); }

  // Admin UI wiring
  window.setupAdmin = async function(){
    const loginBtn = document.getElementById('loginBtn');
    const adminPass = document.getElementById('adminPass');
    const loginBox = document.getElementById('loginBox');
    const adminArea = document.getElementById('adminArea');

    loginBtn.onclick = ()=> {
      if(adminPass.value === ADMIN_PASSWORD){
        loginBox.style.display = 'none';
        adminArea.style.display = 'block';
        renderAdminLists();
      } else {
        alert('Incorrect password.');
      }
    };

    // Add mod
    document.getElementById('addMod').onclick = async ()=>{
      const title = document.getElementById('modTitle').value.trim();
      const link = document.getElementById('modLink').value.trim();
      const file = document.getElementById('modImage').files[0];
      if(!title) return alert('Title required');
      const data = load();
      const id = uid('mod');
      let img = '';
      if(file){ img = await fileToDataUrl(file); }
      data.mods.unshift({ id, title, link, image: img, size: '', tags: '' });
      save(data); renderAdminLists(); alert('Added');
    };

    // Add book
    document.getElementById('addBook').onclick = async ()=>{
      const cat = document.getElementById('bookCat').value;
      const title = document.getElementById('bookTitle').value.trim();
      const link = document.getElementById('bookLink').value.trim();
      const file = document.getElementById('bookImage').files[0];
      if(!title) return alert('Title required');
      const data = load();
      const id = uid('book');
      let img = '';
      if(file){ img = await fileToDataUrl(file); }
      data.books[cat].unshift({ id, title, link, image: img });
      save(data); renderAdminLists(); alert('Book added');
    };

    // Add config
    document.getElementById('addCfg').onclick = ()=>{
      const title = document.getElementById('cfgTitle').value.trim();
      const link = document.getElementById('cfgLink').value.trim();
      if(!title) return alert('Title required');
      const data = load();
      const id = uid('cfg');
      data.configs.unshift({ id, title, link });
      save(data); renderAdminLists(); alert('Config added');
    };

    document.getElementById('exportData').onclick = ()=>{
      const data = load();
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='modapk_data.json'; a.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById('importBtn').onclick = ()=>{
      const f = document.getElementById('importFile').files[0];
      if(!f) return alert('Choose file');
      const r = new FileReader();
      r.onload = ()=>{ try{ const d = JSON.parse(r.result); save(d); alert('Imported'); renderAdminLists(); }catch(e){ alert('Invalid JSON'); } };
      r.readAsText(f);
    };
  };

  function renderAdminLists(){
    const data = load();
    // mods list
    const modsList = document.getElementById('modsList');
    if(modsList){
      modsList.innerHTML = data.mods.map(m=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(m.title)}</strong><div style="font-size:12px;opacity:0.85">${escapeHtml(m.link||'')}</div></div><div><button class="btn small" onclick="window.deleteMod('${m.id}')">Delete</button></div></div>`).join('');
    }
    const booksList = document.getElementById('booksList');
    if(booksList){
      let html = '';
      Object.keys(data.books).forEach(cat=>{
        html += '<h4 style="margin-top:8px">'+cat+'</h4>';
        html += data.books[cat].map(b=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(b.title)}</strong><div style="font-size:12px;opacity:0.85">${escapeHtml(b.link||'')}</div></div><div><button class="btn small" onclick="window.deleteBook('${cat}','${b.id}')">Delete</button></div></div>`).join('');
      });
      booksList.innerHTML = html;
    }
    const cfgList = document.getElementById('cfgList');
    if(cfgList){
      cfgList.innerHTML = data.configs.map(c=>`<div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(c.title)}</strong><div style="font-size:12px;opacity:0.85">${escapeHtml(c.link||'')}</div></div><div><button class="btn small" onclick="window.deleteCfg('${c.id}')">Delete</button></div></div>`).join('');
    }

    // Re-render public pages
    window.renderMods(''); window.renderBooks('10th',''); window.renderConfigs('');
  }

  window.deleteMod = function(id){
    if(!confirm('Delete this mod?')) return;
    const data = load(); data.mods = data.mods.filter(m=>m.id!==id); save(data); renderAdminLists();
  };
  window.deleteBook = function(cat,id){
    if(!confirm('Delete book?')) return;
    const data = load(); data.books[cat] = data.books[cat].filter(b=>b.id!==id); save(data); renderAdminLists();
  };
  window.deleteCfg = function(id){
    if(!confirm('Delete config?')) return;
    const data = load(); data.configs = data.configs.filter(c=>c.id!==id); save(data); renderAdminLists();
  };

  // small utility
  function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

  // theme toggle simple (adds class on body)
  function applyTheme(){
    const theme = localStorage.getItem('modapk_theme') || 'neon';
    if(theme === 'neon'){ document.body.classList.remove('dark'); } else { document.body.classList.add('dark'); }
  }
  window.toggleTheme = function(){
    const cur = localStorage.getItem('modapk_theme') || 'neon';
    localStorage.setItem('modapk_theme', cur==='neon'?'dark':'neon'); applyTheme();
  }

  // expose some init
  window.appInit = function(){
    applyTheme();
    if(document.getElementById('loginBtn')) window.setupAdmin();
    // hook theme toggle
    const t = document.getElementById('themeToggle');
    if(t) t.onclick = ()=> window.toggleTheme();
  };

  // auto init
  document.addEventListener('DOMContentLoaded', ()=> window.appInit());

})();
