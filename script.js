class CRM {
  constructor() {
    this.STAGES = ['Lead','Contacted','Qualified','Proposal','Closed'];
    // Initialize fresh
    if (!localStorage.getItem('crm')) localStorage.setItem('crm', '[]');
    this.clients = JSON.parse(localStorage.getItem('crm'));
    this.loadTheme();
    window.addEventListener('storage', () => this.load().render());
  }
  save()   { localStorage.setItem('crm', JSON.stringify(this.clients)); }
  load()   { this.clients = JSON.parse(localStorage.getItem('crm')) || []; return this; }
  add(c)   { c.id = Date.now(); this.clients.push(c); this.save(); }
  update(c){ this.clients = this.clients.map(x=>x.id===c.id?c:x); this.save(); }
  delete(id){this.clients = this.clients.filter(x=>x.id!==id); this.save();}

  loadTheme() {
    const t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    qs('#toggle-theme').textContent = t==='light'?'🌙':'☀️';
  }
  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme'),
          next = cur==='light'?'dark':'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    qs('#toggle-theme').textContent = next==='light'?'🌙':'☀️';
  }
}

const crm = new CRM(),
      qs = s => document.querySelector(s),
      qa = s => [...document.querySelectorAll(s)];

function render() {
  const pipe = qs('#pipeline');
  pipe.innerHTML = '';
  crm.STAGES.forEach(stage => {
    const col = document.createElement('div');
    col.className = 'column';
    col.innerHTML = `<h3>${stage}</h3><div class="cards" data-stage="${stage}"></div>`;
    pipe.appendChild(col);
  });

  const txt = qs('#search').value.toLowerCase(),
        sel = qs('#filterStage').value;

  crm.clients
    .filter(c => (!sel || c.stage===sel) &&
                 (c.name.toLowerCase().includes(txt) || c.email.includes(txt)))
    .forEach(createCard);

  initDrag();
  updateChart();
}

function createCard(c) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = c.id;
  card.innerHTML = `
    <strong>${c.name}</strong>
    <div class="meta">📧 ${c.email} | 📞 ${c.phone}</div>
    <div class="badges">
      ${c.tags.map(t => `<span class="badge">${t}</span>`).join('')}
      <span class="badge ${c.stage==='Closed'?'closed':''}">${c.stage}</span>
    </div>`;
  qs(`.cards[data-stage="${c.stage}"]`).appendChild(card);
}

function initDrag() {
  let dragged;
  qa('.card').forEach(cd => cd.ondragstart = () => dragged = cd);
  qa('.cards').forEach(zone => {
    zone.ondragover = e => e.preventDefault();
    zone.ondrop = () => {
      const id = +dragged.dataset.id,
            client = crm.clients.find(x=>x.id===id);
      client.stage = zone.dataset.stage;
      crm.update(client);
      render();
    };
  });
}

let editId = null;
qs('#btn-add').onclick = () => {
  editId = null;
  qs('#modal-title').textContent = 'New Client';
  qs('#client-form').reset();
  qs('#modal').classList.remove('hidden');
};
qs('#btn-cancel').onclick = () => qs('#modal').classList.add('hidden');
qs('#btn-reset').onclick = () => {
  if (confirm('Clear all clients?')) {
    localStorage.setItem('crm','[]');
    crm.load(); render();
  }
};

qs('#client-form').onsubmit = e => {
  e.preventDefault();
  const c = {
    id: editId,
    name: qs('#name').value.trim(),
    email: qs('#email').value.trim(),
    phone: qs('#phone').value.trim(),
    tags: qs('#tags').value.split(',').map(s=>s.trim()).filter(Boolean),
    stage: qs('#stage').value
  };
  editId ? crm.update(c) : crm.add(c);
  qs('#modal').classList.add('hidden');
  render();
};

qs('#search').oninput = render;
qs('#filterStage').onchange = render;

// CSV export/import
function toCSV(arr) {
  const hdr = ['id','name','email','phone','tags','stage'];
  const rows = arr.map(c => hdr.map(k =>
    `"${(k==='tags'?c.tags.join(';'):c[k]||'').replace(/"/g,'""')}"`
  ).join(','));
  return [hdr.join(','), ...rows].join('\n');
}
qs('#btn-export').onclick = () => {
  const blob = new Blob([toCSV(crm.clients)],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='clients.csv'; a.click();
};
qs('#btn-import').onclick = () => qs('#importFile').click();
qs('#importFile').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const [hdr, ...rows] = r.result.trim().split('\n');
    const keys = hdr.split(',');
    rows.forEach(rw => {
      const vals = rw.match(/(".*?"|[^,]+)/g).map(s=>
        s.replace(/^"|"$/g,'').replace(/""/g,'"')
      );
      const obj = {};
      keys.forEach((k,i)=> obj[k] = vals[i]);
      obj.tags = obj.tags.split(';').map(s=>s.trim()).filter(Boolean);
      crm.add(obj);
    });
    render();
  };
  r.readAsText(f);
};

// Theme toggle
qs('#toggle-theme').onclick = () => crm.toggleTheme();

// Chart.js summary
let chart;
function updateChart() {
  const ctx = qs('#pipelineChart').getContext('2d'),
        data = crm.STAGES.map(s => crm.clients.filter(c=>c.stage===s).length);
  if (chart) {
    chart.data.datasets[0].data = data;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'pie',
      data: { labels: crm.STAGES, datasets: [{ data }] },
      options: { responsive: true }
    });
  }
}

// Initial render
render();
