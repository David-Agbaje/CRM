class CRM {
  constructor() {
    this.STAGES = ['Lead','Contacted','Qualified','Proposal','Closed'];
    this.clients = JSON.parse(localStorage.getItem('crm')) || [];
    this.loadTheme();
    window.addEventListener('storage', () => this.load().render());
  }

  save() {
    localStorage.setItem('crm', JSON.stringify(this.clients));
  }

  load() {
    this.clients = JSON.parse(localStorage.getItem('crm')) || [];
    return this;
  }

  add(c) {
    c.id = Date.now(); this.clients.push(c); this.save();
  }

  update(c) {
    this.clients = this.clients.map(x => x.id === c.id ? c : x);
    this.save();
  }

  delete(id) {
    this.clients = this.clients.filter(x => x.id !== id);
    this.save();
  }

  loadTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('toggle-theme').textContent = theme === 'light' ? '🌙' : '☀️';
  }

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.getElementById('toggle-theme').textContent = next === 'light' ? '🌙' : '☀️';
  }
}

const crm = new CRM();
const qs = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));

function render() {
  const pipeline = qs('#pipeline');
  pipeline.innerHTML = '';

  crm.STAGES.forEach(stage => {
    const col = document.createElement('div');
    col.className = 'column';
    col.innerHTML = `<h3>${stage}</h3><div class="cards" data-stage="${stage}"></div>`;
    pipeline.appendChild(col);
  });

  const txt = qs('#search').value.toLowerCase();
  const sel = qs('#filterStage').value;

  crm.clients
    .filter(c => (!sel || c.stage === sel) &&
                 (c.name.toLowerCase().includes(txt) || c.email.includes(txt)))
    .forEach(c => createCard(c));

  initDrag(); updateChart();
}

function createCard(c) {
  const card = document.createElement('div');
  card.className = 'card'; card.draggable = true;
  card.dataset.id = c.id;
  card.innerHTML = `
    <strong>${c.name}</strong>
    <div class="meta">📧 ${c.email} | 📞 ${c.phone}</div>
    <div class="badges">
      ${c.tags.map(t => `<span class="badge">${t}</span>`).join('')}
      <span class="badge ${c.stage === 'Closed' ? 'closed' : ''}">${c.stage}</span>
    </div>`;
  qs(`.cards[data-stage="${c.stage}"]`).appendChild(card);
}

function initDrag() {
  let dragged;
  qa('.card').forEach(card => {
    card.ondragstart = () => { dragged = card; card.classList.add('dragging'); };
    card.ondragend   = () => { card.classList.remove('dragging'); };
  });

  qa('.cards').forEach(zone => {
    zone.ondragover = e => e.preventDefault();
    zone.ondrop = () => {
      const id = +dragged.dataset.id;
      const client = crm.clients.find(c => c.id === id);
      client.stage = zone.dataset.stage;
      crm.update(client);
      render();
    };
  });
}

let editId = null;
qs('#btn-add').onclick = () => {
  editId = null; qs('#modal-title').textContent = 'New Client';
  qs('#client-form').reset(); qs('#modal').classList.remove('hidden');
};
qs('#btn-cancel').onclick = () => qs('#modal').classList.add('hidden');

qs('#client-form').onsubmit = e => {
  e.preventDefault();
  const c = {
    id: editId,
    name: qs('#name').value.trim(),
    email: qs('#email').value.trim(),
    phone: qs('#phone').value.trim(),
    tags: qs('#tags').value.split(',').map(s => s.trim()).filter(Boolean),
    stage: qs('#stage').value,
    notes: qs('#notes').value.trim()
  };
  editId ? crm.update(c) : crm.add(c);
  qs('#modal').classList.add('hidden'); render();
};

qs('#search').oninput = render; qs('#filterStage').onchange = render;

function toCSV(arr) {
  const hdr = ['id','name','email','phone','tags','stage','notes'];
  const rows = arr.map(c => hdr.map(k =>
    `"${(k==='tags' ? c.tags.join(';') : c[k]||'').replace(/"/g,'""')}"`
  ).join(','));
  return [hdr.join(','), ...rows].join('\n');
}

qs('#btn-export').onclick = () => {
  const blob = new Blob([toCSV(crm.clients)], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='clients.csv'; a.click();
};
qs('#btn-import').onclick = () => qs('#importFile').click();
qs('#importFile').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const [hdr, ...rows] = reader.result.trim().split('\n');
    const keys = hdr.split(',');
    rows.forEach(r => {
      const vals = r.match(/(".*?"|[^,]+)/g)
                    .map(s => s.replace(/^"|"$/g,'').replace(/""/g,'"'));
      const obj = {};
      keys.forEach((k,i) => obj[k] = vals[i]);
      obj.tags = obj.tags.split(';').map(s => s.trim()).filter(Boolean);
      crm.add(obj);
    }); render();
  };
  reader.readAsText(file);
};

qs('#toggle-theme').onclick = () => crm.toggleTheme();

let chart;
function updateChart() {
  const ctx = qs('#pipelineChart').getContext('2d');
  const data = crm.STAGES.map(s => crm.clients.filter(c => c.stage===s).length);
  if (chart) {
    chart.data.datasets[0].data = data; chart.update();
  } else {
    chart = new Chart(ctx, {
      type:'pie', data:{labels:crm.STAGES, datasets:[{data}]},
      options:{responsive:true}
    });
  }
}

render();