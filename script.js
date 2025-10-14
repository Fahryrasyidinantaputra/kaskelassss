// ========= util & UI =========
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => new Intl.NumberFormat('id-ID').format(n);
const money = n => `Rp ${fmt(Number(n||0))}`;
const toast = (icon, text) => Swal.fire({icon, text, timer:1400, showConfirmButton:false});
const confirmBox = (title, text) => Swal.fire({icon:'question', title, text, showCancelButton:true, confirmButtonText:'Ya', cancelButtonText:'Batal'});

// ========= auth =========
const me = JSON.parse(localStorage.getItem('activeUser') || 'null');
if (!me) location.href = 'login.html';
$('#whoami').textContent = `${me?.nama || me?.username}`;
$('#logout').onclick = ()=>{ localStorage.removeItem('activeUser'); location.href='login.html'; };

// ========= nav =========
$$('.menu a').forEach(a=>{
  a.onclick=()=>{
    $$('.menu a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    $$('.page').forEach(x=>x.classList.remove('active'));
    $('#page-'+a.dataset.page).classList.add('active');
  };
});

// ========= state =========
let IURAN = DEFAULT_IURAN;
let START_WEEK = null;
let users = {};
let transaksi = {};

const todayISO = () => new Date().toISOString().slice(0,10);
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?-6:1)-day; dt.setDate(dt.getDate()+diff); dt.setHours(0,0,0,0); return dt; }
function endOfWeek(d){ const s=startOfWeek(d); const e=new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return e; }
function startOfMonth(d){ const dt=new Date(d); dt.setDate(1); dt.setHours(0,0,0,0); return dt; }
function endOfMonth(d){ const dt=new Date(d); dt.setMonth(dt.getMonth()+1,0); dt.setHours(23,59,59,999); return dt; }
function startOfYear(d){ const dt=new Date(d); dt.setMonth(0,1); dt.setHours(0,0,0,0); return dt; }
function endOfYear(d){ const dt=new Date(d); dt.setMonth(11,31); dt.setHours(23,59,59,999); return dt; }

$('#mingguIni').textContent = `${startOfWeek(new Date()).toLocaleDateString('id-ID')} – ${endOfWeek(new Date()).toLocaleDateString('id-ID')}`;

// ========= settings =========
function loadSettings(){
  return db.ref('settings').once('value').then(s=>{
    const v=s.val()||{};
    IURAN = Number(v.iuran||DEFAULT_IURAN);
    START_WEEK = v.start_week||null;
    $('#iuranLabel').textContent = money(IURAN);
    $('#setIuran').value = IURAN;
    $('#setStart').value = START_WEEK || '';
  });
}
$('#btnSimpanPengaturan').onclick=()=>{
  const i = Number($('#setIuran').value||0);
  const st = $('#setStart').value||null;
  db.ref('settings').set({iuran:i, start_week:st}).then(()=>{ toast('success','Disimpan'); loadSettings(); renderAll(); });
};
$('#btnReloadPengaturan').onclick=()=>loadSettings();

// ========= users =========
function loadUsers(){
  return db.ref('users').once('value').then(s=>{ users = s.val()||{}; renderAnggota(); });
}
function renderAnggota(){
  const q = ($('#cariAnggota').value||'').toLowerCase();
  const tbody = $('#tbodyAnggota'); tbody.innerHTML='';
  Object.values(users).filter(u=>u.role!=='admin')
    .filter(u=>!q || u.nama.toLowerCase().includes(q) || (u.username||'').includes(q))
    .sort((a,b)=> (a.nama>b.nama?1:-1))
    .forEach(u=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.nama}</td>
        <td>${u.email || '-'}</td>
        <td><span class="badge">${u.role||'anggota'}</span></td>
        <td>
          <button class="btn small" data-act="reset" data-id="${u.username}">Reset PW</button>
          <button class="btn small" data-act="toggle" data-id="${u.username}">${u.aktif===false?'Aktifkan':'Nonaktifkan'}</button>
          <button class="btn small danger" data-act="hapus" data-id="${u.username}">Hapus</button>
        </td>`;
      tbody.appendChild(tr);
    });

  tbody.onclick=(e)=>{
    const b=e.target.closest('button'); if(!b) return;
    const id=b.dataset.id, act=b.dataset.act;
    if(act==='reset'){
      const email = users[id]?.email||'';
      if(!email) return toast('error','Email kosong');
      db.ref('users/'+id+'/password').set(email).then(()=>toast('success','Password = email diset ulang'));
    }else if(act==='toggle'){
      const now = users[id].aktif===false ? true:false;
      db.ref('users/'+id+'/aktif').set(now).then(()=>{ toast('success','Status diubah'); loadUsers(); });
    }else if(act==='hapus'){
      confirmBox('Hapus Anggota?','Akun login akan dihapus.').then(r=>{
        if(r.isConfirmed) db.ref('users/'+id).remove().then(()=>{ toast('success','Terhapus'); loadUsers(); });
      });
    }
  };
}
$('#cariAnggota').oninput=renderAnggota;
$('#btnTambahAnggota').onclick=()=>{
  Swal.fire({
    title:'Tambah Anggota',
    html:`<input id="nim" class="swal2-input" placeholder="NIM">
          <input id="nama" class="swal2-input" placeholder="Nama">
          <input id="email" class="swal2-input" placeholder="Email (juga jadi password)">`,
    preConfirm:()=>{
      const nim=$('#nim').value.trim(), nama=$('#nama').value.trim(), email=$('#email').value.trim();
      if(!nim||!nama||!email){ Swal.showValidationMessage('Lengkapi semua'); return false; }
      return {nim,nama,email};
    },
    showCancelButton:true
  }).then(r=>{
    if(!r.value) return;
    db.ref('users/'+r.value.nim).once('value').then(s=>{
      if(s.exists()) return toast('error','NIM sudah ada');
      db.ref('users/'+r.value.nim).set({username:r.value.nim, nama:r.value.nama, email:r.value.email, password:r.value.email, role:'anggota', aktif:true})
        .then(()=>{ toast('success','Ditambahkan'); loadUsers(); });
    });
  });
};

// ========= transaksi =========
function transaksiArray(){ return Object.entries(transaksi).map(([id,t])=>({id,...t})).sort((a,b)=> (a.tanggal>b.tanggal?-1:1)); }

function renderTransaksi(){
  const q = ($('#search').value||'').toLowerCase();
  const mode = $('#filterRange').value;
  const now = new Date();
  let arr = transaksiArray();

  let start=null,end=null;
  if(mode==='week'){ start=startOfWeek(now); end=endOfWeek(now); }
  if(mode==='month'){ start=startOfMonth(now); end=endOfMonth(now); }
  if(mode==='year'){ start=startOfYear(now); end=endOfYear(now); }
  if(mode!=='all'){ arr = arr.filter(t=>{ const d=new Date(t.tanggal); return d>=start && d<=end; }); }

  if(q) arr = arr.filter(t=> (t.nama||'').toLowerCase().includes(q) || (t.catatan||'').toLowerCase().includes(q));

  const tbody = $('#tbody'); tbody.innerHTML=''; let has=false;
  arr.forEach(t=>{
    has=true;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td>${t.nama}</td>
      <td><span class="badge ${t.jenis==='pengeluaran'?'danger':''}">${t.jenis}</span></td>
      <td>${t.metode||'-'}</td>
      <td class="right">${money(t.nominal)}</td>
      <td>${t.catatan||''}</td>
      <td>
        <button class="btn small" data-edit="${t.id}">Edit</button>
        <button class="btn small danger" data-del="${t.id}">Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $('#empty').style.display = has?'none':'block';

  // saldo total
  let s=0; transaksiArray().forEach(t=> s += (t.jenis==='setoran'?1:-1)*Number(t.nominal||0));
  $('#saldo').textContent = money(s);

  tbody.onclick=(e)=>{
    const ed=e.target.closest('button[data-edit]'); const del=e.target.closest('button[data-del]');
    if(ed) openEditor(ed.dataset.edit);
    if(del) deleteTransaksi(del.dataset.del);
  };
}
$('#search').oninput=renderTransaksi;
$('#filterRange').onchange=renderTransaksi;

function baseTransaksi(t={}){ const today=todayISO(); return {
  tanggal: t.tanggal||today, username:t.username||'', nama:t.nama||'', jenis:t.jenis||'setoran', metode:t.metode||'tunai', nominal:Number(t.nominal||IURAN), catatan:t.catatan||''
}; }

function openEditor(id){
  const isEdit=!!id;
  const data=isEdit?baseTransaksi(transaksi[id]):baseTransaksi();
  const options = Object.values(users).filter(u=>u.role!=='admin' && u.aktif!==false)
    .map(u=>`<option value="${u.username}" ${u.username===data.username?'selected':''}>${u.nama} (${u.username})</option>`).join('');

  Swal.fire({
    title:isEdit?'Edit Transaksi':'Tambah Transaksi',
    html:`<div class="formgrid">
      <label>Tanggal<input id="f_tgl" type="date" class="swal2-input" value="${data.tanggal}"></label>
      <label>Anggota<select id="f_user" class="swal2-input"><option value="">—pilih—</option>${options}</select></label>
      <label>Jenis<select id="f_jenis" class="swal2-input">
        <option value="setoran" ${data.jenis==='setoran'?'selected':''}>Setoran</option>
        <option value="pengeluaran" ${data.jenis==='pengeluaran'?'selected':''}>Pengeluaran</option>
      </select></label>
      <label>Metode<select id="f_metode" class="swal2-input">
        <option value="tunai" ${data.metode==='tunai'?'selected':''}>Tunai</option>
        <option value="qris" ${data.metode==='qris'?'selected':''}>QRIS</option>
      </select></label>
      <label>Nominal (Rp)<input id="f_nom" type="number" class="swal2-input" min="0" value="${data.nominal}"></label>
      <label>Catatan<input id="f_cat" class="swal2-input" value="${data.catatan}"></label>
    </div>
    <div class="muted" style="margin-top:6px">QRIS: scan QR statis, isi nominal & (opsional) kode referensi di catatan.</div>`,
    width:650, showCancelButton:true, confirmButtonText:isEdit?'Simpan':'Tambah',
    preConfirm:()=>{
      const tgl=$('#f_tgl').value, uname=$('#f_user').value, jenis=$('#f_jenis').value, metode=$('#f_metode').value, nominal=Number($('#f_nom').value||0), catatan=$('#f_cat').value.trim();
      if(!tgl||!uname||nominal<=0){ Swal.showValidationMessage('Tanggal, anggota, nominal wajib diisi'); return false; }
      const nama = users[uname]?.nama || uname;
      return {tanggal:tgl, username:uname, nama, jenis, metode, nominal, catatan};
    }
  }).then(r=>{
    if(!r.value) return;
    if(isEdit) db.ref('transaksi/'+id).update(r.value).then(()=>toast('success','Disimpan'));
    else { const key=db.ref('transaksi').push().key; db.ref('transaksi/'+key).set({...r.value,id:key}).then(()=>toast('success','Ditambahkan')); }
  });
}
function deleteTransaksi(id){
  confirmBox('Hapus transaksi?','Tindakan ini tidak bisa dibatalkan.').then(res=>{
    if(res.isConfirmed) db.ref('transaksi/'+id).remove().then(()=>toast('success','Dihapus'));
  });
}
$('#btnAddCash').onclick = ()=>openEditor();
$('#btnAddQRIS').onclick = ()=>openEditor();
$('#btnPengeluaran').onclick = ()=>{ openEditor(); setTimeout(()=>{ $('#f_jenis').value='pengeluaran'; $('#f_metode').value='tunai'; },50); };

// ========= rekap =========
function sumByUserInRange(uname, start, end){
  let sum=0;
  transaksiArray().forEach(t=>{
    if(t.username!==uname) return; const d=new Date(t.tanggal);
    if(d>=start && d<=end && t.jenis==='setoran') sum += Number(t.nominal||0);
  });
  return sum;
}
function periodRange(mode, iso){
  const d=new Date(iso||todayISO());
  if(mode==='week') return [startOfWeek(d), endOfWeek(d)];
  if(mode==='month') return [startOfMonth(d), endOfMonth(d)];
  if(mode==='year') return [startOfYear(d), endOfYear(d)];
  return [startOfWeek(d), endOfWeek(d)];
}
function renderRekap(){
  const mode=$('#rekapMode').value, date=$('#rekapDate').value||todayISO();
  const [start,end]=periodRange(mode,date);
  const q = ($('#cariNamaRekap').value||'').toLowerCase();
  const tbody=$('#tbodyRekap'); tbody.innerHTML='';
  Object.values(users).filter(u=>u.role!=='admin' && u.aktif!==false)
    .filter(u=>!q || u.nama.toLowerCase().includes(q) || (u.username||'').includes(q))
    .sort((a,b)=> (a.nama>b.nama?1:-1))
    .forEach(u=>{
      const paid = sumByUserInRange(u.username, start, end);
      const sisa = Math.max(IURAN - paid, 0);
      const status = sisa<=0 ? `<span class="badge success">Lunas</span>` : `<span class="badge warn">Kurang ${money(sisa)}</span>`;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${u.nama}</td><td>${money(paid)}</td><td>${money(sisa)}</td><td>${status}</td>`;
      tbody.appendChild(tr);
    });
}
$('#rekapMode').onchange=renderRekap;
$('#rekapDate').onchange=renderRekap;
$('#btnRefreshRekap').onclick=renderRekap;
$('#cariNamaRekap').oninput=renderRekap;

function renderAll(){ $('#iuranLabel').textContent = money(IURAN); renderRekap(); }

// ========= init =========
Promise.all([loadSettings(), loadUsers()]).then(()=>{
  db.ref('transaksi').on('value', s=>{ transaksi=s.val()||{}; renderTransaksi(); renderAll(); });
  renderTransaksi(); renderRekap();
});
