/* ===== Helper UI ===== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => new Intl.NumberFormat('id-ID').format(n);
const money = n => `Rp ${fmt(n)}`;

const alert = (icon, text) => Swal.fire({icon, text, timer: 1400, showConfirmButton: false});
const confirmBox = (title, text) => Swal.fire({icon:'question', title, text, showCancelButton:true, confirmButtonText:'Ya', cancelButtonText:'Batal'});

/* ===== Auth / Session ===== */
const me = JSON.parse(localStorage.getItem('activeUser') || 'null');
if (!me) location.href = 'login.html';
$('#whoami').textContent = me?.nama || me?.username || '—';
$('#logout').onclick = ()=>{ localStorage.removeItem('activeUser'); location.href='login.html'; };

/* ===== Tabs (menu) ===== */
$$('.menu a').forEach(a=>{
  a.onclick=()=>{
    $$('.menu a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    $$('.page').forEach(x=>x.classList.remove('active'));
    $('#page-'+a.dataset.page).classList.add('active');
  };
});

/* ===== State ===== */
let IURAN = DEFAULT_IURAN;
let START_WEEK = null; // string YYYY-MM-DD jika di-set
let users = {};        // {username: user}
let transaksi = {};    // {id: {...}}

/* ===== Waktu/Range ===== */
const todayISO = () => new Date().toISOString().slice(0,10);

function startOfWeek(d){
  const dt = new Date(d);
  const day = dt.getDay(); // 0 Minggu
  const diff = (day===0? -6 : 1) - day; // mulai Senin
  dt.setDate(dt.getDate()+diff);
  dt.setHours(0,0,0,0);
  return dt;
}
function endOfWeek(d){
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate()+6); e.setHours(23,59,59,999);
  return e;
}
function startOfMonth(d){ const dt=new Date(d); dt.setDate(1); dt.setHours(0,0,0,0); return dt; }
function endOfMonth(d){ const dt=new Date(d); dt.setMonth(dt.getMonth()+1,0); dt.setHours(23,59,59,999); return dt; }
function startOfYear(d){ const dt=new Date(d); dt.setMonth(0,1); dt.setHours(0,0,0,0); return dt; }
function endOfYear(d){ const dt=new Date(d); dt.setMonth(11,31); dt.setHours(23,59,59,999); return dt; }

$('#mingguIni').textContent = `${startOfWeek(new Date()).toLocaleDateString('id-ID')} – ${endOfWeek(new Date()).toLocaleDateString('id-ID')}`;

/* ===== Pengaturan (load/simpan) ===== */
function loadSettings(){
  return db.ref('settings').once('value').then(s=>{
    const v = s.val()||{};
    IURAN = Number(v.iuran || DEFAULT_IURAN);
    START_WEEK = v.start_week || null;
    $('#iuranLabel').textContent = money(IURAN);
    $('#setIuran').value = IURAN;
    $('#setStart').value = START_WEEK || '';
  });
}
$('#btnSimpanPengaturan').onclick=()=>{
  const i = Number($('#setIuran').value||0);
  const st = $('#setStart').value || null;
  db.ref('settings').set({ iuran:i, start_week:st }).then(()=>{
    alert('success','Pengaturan disimpan'); loadSettings(); renderAll();
  });
};
$('#btnReloadPengaturan').onclick=()=>loadSettings();

/* ===== Users (anggota) ===== */
function loadUsers(){
  return db.ref('users').once('value').then(s=>{
    users = s.val()||{};
    renderAnggota();
  });
}

function renderAnggota(){
  const tbody = $('#tbodyAnggota');
  const q = ($('#cariAnggota').value||'').toLowerCase();
  tbody.innerHTML = '';
  Object.values(users)
    .filter(u => u.role!=='admin')
    .filter(u => !q || u.nama.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    .forEach(u=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.nama}</td>
        <td><span class="badge">${u.role||'anggota'}</span></td>
        <td>
          <button class="btn small" data-act="toggle" data-id="${u.username}">${u.aktif===false?'Aktifkan':'Nonaktifkan'}</button>
          <button class="btn small danger" data-act="hapus" data-id="${u.username}">Hapus</button>
        </td>`;
      tbody.appendChild(tr);
    });

  tbody.onclick = (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const id = b.dataset.id, act=b.dataset.act;
    if(act==='toggle'){
      const now = users[id].aktif===false ? true:false;
      db.ref('users/'+id+'/aktif').set(now).then(()=>{ alert('success','Status diubah'); loadUsers(); });
    }else if(act==='hapus'){
      confirmBox('Hapus Anggota?','Semua datanya tetap ada, tapi akun login dihapus.').then(res=>{
        if(res.isConfirmed) db.ref('users/'+id).remove().then(()=>{ alert('success','Anggota dihapus'); loadUsers(); });
      });
    }
  };
}
$('#cariAnggota').oninput = renderAnggota;
$('#btnTambahAnggota').onclick = ()=>{
  Swal.fire({
    title:'Tambah Anggota',
    html:`<input id="n" class="swal2-input" placeholder="Nama">
          <input id="u" class="swal2-input" placeholder="Username">
          <input id="p" class="swal2-input" placeholder="Password">`,
    preConfirm:()=>{
      const n = document.getElementById('n').value.trim();
      const u = document.getElementById('u').value.trim();
      const p = document.getElementById('p').value.trim();
      if(!n||!u||!p){ Swal.showValidationMessage('Lengkapi semua'); return false; }
      return {n,u,p};
    },
    showCancelButton:true
  }).then(r=>{
    if(!r.value) return;
    db.ref('users/'+r.value.u).once('value').then(s=>{
      if(s.exists()) return alert('error','Username sudah ada');
      db.ref('users/'+r.value.u).set({nama:r.value.n, username:r.value.u, password:r.value.p, role:'anggota', aktif:true})
        .then(()=>{ alert('success','Anggota ditambahkan'); loadUsers(); });
    });
  });
};

/* ===== Transaksi ===== */
function loadTransaksi(){
  return db.ref('transaksi').on('value', s=>{
    transaksi = s.val()||{};
    renderTransaksi(); renderAll();
  });
}

function transaksiArray(){
  return Object.entries(transaksi).map(([id,t])=>({id,...t})).sort((a,b)=> (a.tanggal>b.tanggal?-1:1));
}

function renderTransaksi(){
  const q = ($('#search').value||'').toLowerCase();
  const mode = $('#filterRange').value;
  const now = new Date();
  let a = transaksiArray();

  // Filter range
  let start=null, end=null;
  if(mode==='week'){ start=startOfWeek(now); end=endOfWeek(now); }
  if(mode==='month'){ start=startOfMonth(now); end=endOfMonth(now); }
  if(mode==='year'){ start=startOfYear(now); end=endOfYear(now); }
  if(mode!=='all' && start && end){
    a = a.filter(t=>{
      const dt = new Date(t.tanggal);
      return dt>=start && dt<=end;
    });
  }

  // Filter search
  a = a.filter(t=>{
    return !q || (t.nama||'').toLowerCase().includes(q) || (t.catatan||'').toLowerCase().includes(q);
  });

  // Render
  const tbody = $('#tbody');
  tbody.innerHTML = '';
  let has = false, saldo=0;
  a.forEach(t=>{
    has = true;
    if(t.jenis==='setoran') saldo += Number(t.nominal||0);
    if(t.jenis==='pengeluaran') saldo -= Number(t.nominal||0);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td>${t.nama}</td>
      <td><span class="badge ${t.jenis==='pengeluaran'?'danger':''}">${t.jenis}</span></td>
      <td>${t.metode||'-'}</td>
      <td class="right">${money(Number(t.nominal||0))}</td>
      <td>${t.catatan||''}</td>
      <td>
        <button class="btn small" data-edit="${t.id}">Edit</button>
        <button class="btn small danger" data-del="${t.id}">Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $('#empty').style.display = has ? 'none' : 'block';

  // Saldo total seluruh transaksi:
  const all = transaksiArray();
  let s=0;
  all.forEach(t=>{
    s += (t.jenis==='setoran'?1:-1)*Number(t.nominal||0);
  });
  $('#saldo').textContent = money(s);

  // aksi
  tbody.onclick = (e)=>{
    const ed = e.target.closest('button[data-edit]');
    const del = e.target.closest('button[data-del]');
    if(ed){ openEditor(ed.dataset.edit); }
    if(del){ deleteTransaksi(del.dataset.del); }
  };
}
$('#search').oninput = renderTransaksi;
$('#filterRange').onchange = renderTransaksi;

function baseTransaksi(t={}){ // default untuk editor
  const today = todayISO();
  return {
    tanggal: t.tanggal || today,
    username: t.username || '',
    nama: t.nama || '',
    jenis: t.jenis || 'setoran', // setoran/pengeluaran
    metode: t.metode || 'tunai', // tunai/qris
    nominal: Number(t.nominal||IURAN),
    catatan: t.catatan || ''
  };
}

function openEditor(id){
  const isEdit = !!id;
  const data = isEdit ? baseTransaksi(transaksi[id]) : baseTransaksi();
  const optionsUser = Object.values(users)
    .filter(u=>u.role!=='admin' && u.aktif!==false)
    .map(u=>`<option value="${u.username}" ${u.username===data.username?'selected':''}>${u.nama} (${u.username})</option>`)
    .join('');

  Swal.fire({
    title: isEdit?'Edit Transaksi':'Tambah Transaksi',
    html: `
      <div class="formgrid">
        <label>Tanggal<input id="f_tanggal" type="date" class="swal2-input" value="${data.tanggal}"></label>
        <label>Anggota<select id="f_user" class="swal2-input"><option value="">— pilih —</option>${optionsUser}</select></label>
        <label>Jenis
          <select id="f_jenis" class="swal2-input">
            <option value="setoran" ${data.jenis==='setoran'?'selected':''}>Setoran</option>
            <option value="pengeluaran" ${data.jenis==='pengeluaran'?'selected':''}>Pengeluaran</option>
          </select>
        </label>
        <label>Metode
          <select id="f_metode" class="swal2-input">
            <option value="tunai" ${data.metode==='tunai'?'selected':''}>Tunai</option>
            <option value="qris" ${data.metode==='qris'?'selected':''}>QRIS</option>
          </select>
        </label>
        <label>Nominal (Rp)<input id="f_nom" type="number" class="swal2-input" min="0" value="${data.nominal}"></label>
        <label>Catatan<input id="f_cat" class="swal2-input" placeholder="opsional" value="${data.catatan}"></label>
      </div>
      <div class="muted" style="margin-top:6px">Catatan: pembayaran via QRIS tidak perlu upload. Isi nominal + (opsional) catatan kode referensi.</div>
    `,
    width: 650,
    showCancelButton:true,
    confirmButtonText: isEdit?'Simpan':'Tambah',
    preConfirm:()=>{
      const tanggal = document.getElementById('f_tanggal').value;
      const uname   = document.getElementById('f_user').value;
      const jenis   = document.getElementById('f_jenis').value;
      const metode  = document.getElementById('f_metode').value;
      const nominal = Number(document.getElementById('f_nom').value||0);
      const catatan = document.getElementById('f_cat').value.trim();
      if(!tanggal||!uname||nominal<=0){ Swal.showValidationMessage('Tanggal, anggota, nominal wajib diisi'); return false; }
      const nama = users[uname]?.nama || uname;
      return {tanggal, username:uname, nama, jenis, metode, nominal, catatan};
    }
  }).then(r=>{
    if(!r.value) return;
    if(isEdit){
      db.ref('transaksi/'+id).update(r.value).then(()=>alert('success','Perubahan disimpan'));
    }else{
      const key = db.ref('transaksi').push().key;
      db.ref('transaksi/'+key).set({...r.value, id:key}).then(()=>alert('success','Transaksi ditambahkan'));
    }
  });
}

function deleteTransaksi(id){
  confirmBox('Hapus transaksi?','Tindakan ini tidak dapat dibatalkan.').then(res=>{
    if(res.isConfirmed) db.ref('transaksi/'+id).remove().then(()=>alert('success','Transaksi dihapus'));
  });
}

// tombol add
$('#btnAddCash').onclick = ()=>openEditor();
$('#btnAddQRIS').onclick = ()=>openEditor(null /*new*/);
$('#btnPengeluaran').onclick = ()=>{
  // editor preset pengeluaran
  openEditor(); 
  setTimeout(()=>{
    $('#f_jenis').value='pengeluaran';
    $('#f_metode').value='tunai';
  }, 50);
};

/* ===== Rekap (sudah/belum bayar, dukung cicilan) ===== */
function sumByUserInRange(uname, start, end){
  let sum=0;
  transaksiArray().forEach(t=>{
    if(t.username!==uname) return;
    const d=new Date(t.tanggal);
    if(d>=start && d<=end && t.jenis==='setoran') sum += Number(t.nominal||0);
  });
  return sum;
}
function periodRange(mode, dateISO){
  const d = new Date(dateISO || todayISO());
  if(mode==='week') return [startOfWeek(d), endOfWeek(d)];
  if(mode==='month') return [startOfMonth(d), endOfMonth(d)];
  if(mode==='year') return [startOfYear(d), endOfYear(d)];
  return [startOfWeek(d), endOfWeek(d)];
}

function renderRekap(){
  const mode = $('#rekapMode').value;
  const valDate = $('#rekapDate').value || todayISO();
  const [start, end] = periodRange(mode, valDate);
  const tbody = $('#tbodyRekap');
  tbody.innerHTML='';
  Object.values(users).filter(u=>u.role!=='admin' && u.aktif!==false).forEach(u=>{
    const paid = sumByUserInRange(u.username, start, end);
    const sisa = Math.max(IURAN - paid, 0);
    const status = sisa<=0 ? `<span class="badge success">Lunas</span>` : `<span class="badge warn">Kurang ${money(sisa)}</span>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${u.nama}</td><td>${money(paid)}</td><td>${money(sisa)}</td><td>${status}</td>`;
    tbody.appendChild(tr);
  });
}
$('#rekapMode').onchange = renderRekap;
$('#rekapDate').onchange = renderRekap;
$('#btnRefreshRekap').onclick = renderRekap;

/* ===== Global render ===== */
function renderAll(){
  $('#iuranLabel').textContent = money(IURAN);
  renderRekap();
}

/* ===== INIT ===== */
Promise.all([loadSettings(), loadUsers()]).then(()=>{
  loadTransaksi(); // realtime
  renderTransaksi();
  renderRekap();
});
