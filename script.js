// --- Data & Persistence ---
class Client {
  constructor({id, name, email, phone, tags, stage, notes, created}) {
    this.id = id || Date.now();
    this.name=name; this.email=email; this.phone=phone;
    this.tags=tags||[]; this.stage=stage; this.notes=notes;
    this.created=created||new Date().toISOString();
  }
}

class CRM {
  constructor() {
    this.clients = JSON.parse(localStorage.getItem('crm'))?.map(o=>new Client(o))||[];
    window.addEventListener('storage', ()=> this.load().render());
  }
  save() {
    localStorage.setItem('crm', JSON.stringify(this.clients));
  }
  load() {
    this.clients = JSON.parse(localStorage.getItem('crm'))?.map(o=>new Client(o))||[];
    return this;
  }
  add(c) { this.clients.push(new Client(c)); this.save(); }
  update(c) {
    this.clients = this.clients.map(x=>x.id===c.id?new Client(c):x);
    this.save();
  }
  delete(id) {
    this.clients = this.clients.filter(x=>x.id!==id);
    this.save();
  }
}

const STAGES = ['Lead','Contacted','Qualified','Proposal','Closed'];
const crm = new CRM();

// --- UI Rendering ---
function renderPipeline(filter='') {
  const container = document.getElementById('pipeline');
  container.innerHTML = '';
  STAGES.forEach(stage=>{
    const col = document.createElement('div');
    col.className='column';
    col.dataset.stage=stage;
    col.innerHTML=`<h3>${stage}</h3>`;
    container.appendChild(col);
  });

  crm.clients
    .filter(c=> {
      const txt=document.getElementById('search').value.toLowerCase();
      const sel=document.getElementById('filterStage').value;
      return (!sel||c.stage===sel) &&
             (c.name.toLowerCase().includes(txt)||c.email.includes(txt));
    })
    .sort((a,b)=> new Date(b.created)-new Date(a.created))
    .forEach(renderCard);

  initDragDrop();
  updateChart();
}

function renderCard(c) {
  const col = document.querySelector(`.column[data-stage="${c.stage}"]`);
  const card = document.createElement('div');
  card.className='card';
  card.draggable=true;
  card.dataset.id=c.id;
  card.innerHTML=`
    <strong>${c.name}</strong>
    <div class="meta">📧 ${c.email} | 📞 ${c.phone}</div>
    <div class="badges">
      ${c.tags.map(t=>`<span class="badge">${t.trim()}</span>`).join('')}
      <span class="badge ${c.stage==='Closed'?'closed':''}">${c.stage}</span>
    </div>`;
  col.appendChild(card);
}

// --- Drag & Drop ---
function initDragDrop(){
  let dragged;
  document.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('dragstart', e=> {
      dragged=card; card.classList.add('dragging');
    });
    card.addEventListener('dragend', e=>{
      card.classList.remove('dragging');
    });
  });
  document.querySelectorAll('.column').forEach(col=>{
    col.addEventListener('dragover', e=> {
      e.preventDefault();
      col.classList.add('over');
    });
    col.addEventListener('dragleave', ()=> col.classList.remove('over'));
    col.addEventListener('drop', e=>{
      col.classList.remove('over');
      const id=+dragged.dataset.id;
      const client=crm.clients.find(c=>c.id===id);
      client.stage=col.dataset.stage;
      crm.update(client);
      renderPipeline();
    });
  });
}

// --- Modal Form ---
const modal = document.getElementById('modal');
const form = document.getElementById('client-form');
let editId = null;

document.getElementById('btn-add').onclick = ()=>{
  editId=null;
  form.reset();
  document.getElementById('modal-title').textContent='New Client';
  modal.classList.remove('hidden');
};
document.getElementById('btn-cancel').onclick = ()=> modal.classList.add('hidden');

form.onsubmit = e=> {
  e.preventDefault();
  const data = {
    id: editId,
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    tags: form.tags.value.split(',').map(s=>s.trim()).filter(Boolean),
    stage: form.stage.value,
    notes: form.notes.value
  };
  if (editId) crm.update(data);
  else crm.add(data);
  modal.classList.add('hidden');
  renderPipeline();
};

// --- Search & Filter ---
document.getElementById('search').oninput =
document.getElementById('filterStage').onchange = ()=> renderPipeline();

// --- CSV Export/Import ---
function toCSV(arr){
  const hdr=['id','name','email','phone','tags','stage','notes','created'];
  const rows = arr.map(c=>hdr.map(k=>JSON.stringify(c[k]||'')).join(','));
  return [hdr.join(','),...rows].join('\n');
}
document.getElementById('btn-export').onclick = ()=>{
  const blob = new Blob([toCSV(crm.clients)], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='clients.csv'; a.click();
};
document.getElementById('btn-import').onclick = ()=>{
  document.getElementById('importFile').click();
};
document.getElementById('importFile').onchange = e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    const [hdr,...rows] = reader.result.split('\n').filter(Boolean);
    const keys = hdr.split(',');
    rows.forEach(r=>{
      const vals = r.match(/(".*?"|[^,]+)/g).map(s=>JSON.parse(s));
      const obj = Object.fromEntries(keys.map((k,i)=>[k, vals[i]]));
      obj.tags = obj.tags.split(',').map(s=>s.trim());
      crm.add(obj);
    });
    renderPipeline();
  };
  reader.readAsText(file);
};

// --- Theme Toggle ---
const root = document.documentElement;
document.getElementById('toggle-theme').onclick = ()=>{
  const t = root.getAttribute('data-theme')==='light'? 'dark':'light';
  root.setAttribute('data-theme', t);
};

// --- Chart Showing Pipeline Counts ---
let chart;
function updateChart() {
  const ctx = document.getElementById('pipelineChart').getContext('2d');
  const counts = STAGES.map(s=> crm.clients.filter(c=>c.stage===s).length );
  if (chart) chart.data.datasets[0].data = counts, chart.update();
  else {
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: STAGES,
        datasets: [{ label:'Clients', data:counts }]
      },
      options: { responsive:true, legend:{display:false} }
    });
  }
}

// --- Init ---
renderPipeline();
root.setAttribute('data-theme','dark');
