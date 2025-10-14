/* ========= util & UI ========= */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => new Intl.NumberFormat('id-ID').format(n);
const money = n => `Rp ${fmt(Number(n||0))}`;
const toast = (icon, text) => Swal.fire({icon, text, timer:1400, showConfirmButton:false});
const confirmBox = (title, text) => Swal.fire({icon:'question', title, text, showCancelButton:true, confirmButtonText:'Ya', cancelButtonText:'Batal'});

/* ========= auth ========= */
const me = JSON.parse(localStorage.getItem('activeUser') || 'null');
if (!me) location.href = 'login.html';
$('#whoami').textContent = `${me?.nama || me?.username}`;
$('#logout').onclick = ()=>{ localStorage.removeItem('activeUser'); location.href='login.html'; };

/* ========= role-based UI ========= */
const isAdmin = (me?.role === 'admin');
if(!isAdmin){
  // sembunyikan kontrol admin
  $('#adminActions')?.remove();
  $$('.admin-only').forEach(el=>el.remove());
}

/* ========= nav ========= */
$$('.menu a').forEach(a=>{
  a.onclick=()=>{
    $$('.menu a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    $$('.page').forEach(x=>x.classList.remove('active'));
    $('#page-'+a.dataset.page).classList.add('active');
  };
});

/* ========= state ========= */
let IURAN = DEFAULT_IURAN;
let START_WEEK = null;
let users = {};
let transaksi = {}; // semua transaksi (setoran/pengeluaran/qris{pending|approved|rejected})

const todayISO = () => new Date().toISOString().slice(0,10);
function startOfDay(d){ const dt=new Date(d); dt.setHours(0,0,0,0); return dt; }
function endOfDay(d){ const dt=new Date(d); dt.setHours(23,59,59,999); return dt; }
function startOfWeek(d){ const dt=new Date(d); const day=dt.getDay(); const diff=(day===0?-6:1)-day; dt.setDate(dt.getDate()+diff); dt.setHours(0,0,0,0); return dt; }
function endOfWeek(d){ const s=startOfWeek(d); const e=new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return e; }
function startOfMonth(d){ const dt=new Date(d); dt.setDate(1); dt.setHours(0,0,0,0); return dt; }
function endOfMonth(d){ const dt=new Date(d); dt.setMonth(dt.getMonth()+1,0); dt.setHours(23,59,59,999); return dt; }
function startOfYear(d){ const dt=new Date(d); dt.setMonth(0,1); dt.setHours(0,0,0,0); return dt; }
function endOfYear(d){ const dt=new Date(d); dt.setMonth(11,31); dt.setHours(23,59,59,999); return dt; }
$('#mingguIni').textContent = `${startOfWeek(new Date()).toLocaleDateString('id-ID')} – ${endOfWeek(new Date()).toLocaleDateString('id-ID')}`;

/* ========= settings ========= */
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
$('#btnSimpanPengaturan')?.addEventListener('click', ()=>{
  const i = Number($('#setIuran').value||0);
  const st = $('#setStart').value||null;
  db.ref('settings').set({iuran:i, start_week:st}).then(()=>{ toast('success','Disimpan'); loadSettings(); renderAll(); });
});
$('#btnReloadPengaturan')?.addEventListener('click', ()=>loadSettings());

/* ========= users ========= */
function loadUsers(){
  return db.ref('users').once('value').then(s=>{ users = s.val()||{}; renderAnggota(); });
}
function renderAnggota(){
  const q = ($('#cariAnggota').value||'').toLowerCase();
  const tbody = $('#tbodyAnggota'); if(!tbody) return;
  tbody.innerHTML='';
  Object.values(users).filter(u=>u.role!=='admin')
    .filter(u=>!q || u.nama.toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q))
    .sort((a,b)=> (a.nama>b.nama?1:-1))
    .forEach(u=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.nama}</td>
        <td>${u.email || '-'}</td>
        <td><span class="badge">${u.role||'anggota'}</span></td>
        <td>
          ${isAdmin ? `
            <button class="btn small" data-act="reset" data-id="${u.username}">Reset PW</button>
            <button class="btn small" data-act="toggle" data-id="${u.username}">${u.aktif===false?'Aktifkan':'Nonaktifkan'}</button>
            <button class="btn small danger" data-act="hapus" data-id="${u.username}">Hapus</button>
          ` : `
            ${me.username===u.username ? `<button class="btn small" data-act="pw" data-id="${u.username}">Ganti Password</button>` : ''}
          `}
        </td>`;
      tbody.appendChild(tr);
    });

  tbody.onclick=(e)=>{
    const b=e.target.closest('button'); if(!b) return;
    const id=b.dataset.id, act=b.dataset.act;
    if(act==='pw'){
      Swal.fire({title:'Ganti Password', input:'text', inputPlaceholder:'password baru', showCancelButton:true})
      .then(r=>{ if(!r.value) return; db.ref('users/'+id+'/password').set(r.value).then(()=>toast('success','Password diperbarui')); });
      return;
    }
    if(!isAdmin) return;
    if(act==='reset'){
      const email = users[id]?.email||'';
      if(!email) return toast('error','Email kosong');
      db.ref('users/'+id+'/password').set(email).then(()=>toast('success','Password = email (reset)'));
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
$('#cariAnggota')?.addEventListener('input', renderAnggota);

/* ========= transaksi ========= */
function transaksiArray(){ return Object.entries(transaksi).map(([id,t])=>({id,...t})).sort((a,b)=> (a.tanggal>b.tanggal?-1:1)); }

function getPeriodRange(mode, baseDate){
  const d = new Date(baseDate||new Date());
  if(mode==='day') return [startOfDay(d), endOfDay(d)];
  if(mode==='week') return [startOfWeek(d), endOfWeek(d)];
  if(mode==='month') return [startOfMonth(d), endOfMonth(d)];
  if(mode==='year') return [startOfYear(d), endOfYear(d)];
  return [new Date(0), new Date(8640000000000000)];
}

function renderTransaksi(){
  const q = ($('#search').value||'').toLowerCase();
  const mode = $('#filterRange').value;
  const [start, end] = getPeriodRange(mode, new Date());
  let arr = transaksiArray();

  arr = arr.filter(t=>{
    const d = new Date(t.tanggal);
    return (mode==='all' || (d>=start && d<=end));
  });

  if(q){
    arr = arr.filter(t=>{
      return (t.nama||'').toLowerCase().includes(q) ||
             (t.username||'').toLowerCase().includes(q) ||
             (t.catatan||'').toLowerCase().includes(q);
    });
  }

  const tbody = $('#tbody'); tbody.innerHTML=''; let has=false;
  arr.forEach(t=>{
    has=true;
    const statusBadge = t.jenis==='qris'
      ? (t.status==='approved' ? '<span class="badge success">approved</span>' :
         t.status==='rejected' ? '<span class="badge danger">rejected</span>' :
         '<span class="badge warn">pending</span>')
      : '-';

    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td>${t.nama}</td>
      <td><span class="badge ${t.jenis==='pengeluaran'?'danger':''}">${t.jenis}</span></td>
      <td>${t.metode||'-'}</td>
      <td class="right">${money(t.nominal)}</td>
      <td>${t.catatan||''}</td>
      <td>${statusBadge}</td>
      <td>
        ${isAdmin && t.status!=='pending' ? `<button class="btn small" data-edit="${t.id}">Edit</button>` : ''}
        ${isAdmin ? `<button class="btn small danger" data-del="${t.id}">Hapus</button>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });
  $('#empty').style.display = has?'none':'block';

  // saldo total (hanya approved + setoran/pengeluaran)
  let s=0;
  transaksiArray().forEach(t=>{
    const masuk = (t.jenis==='setoran') || (t.jenis==='qris' && t.status==='approved');
    const keluar = (t.jenis==='pengeluaran');
    if(masuk) s += Number(t.nominal||0);
    if(keluar) s -= Number(t.nominal||0);
  });
  $('#saldo').textContent = money(s);

  tbody.onclick=(e)=>{
    const ed=e.target.closest('button[data-edit]'); const del=e.target.closest('button[data-del]');
    if(ed) openEditor(ed.dataset.edit);
    if(del) deleteTransaksi(del.dataset.del);
  };
}
$('#search').oninput=renderTransaksi;
$('#filterRange').onchange=renderTransaksi;

/* editor transaksi (admin only) */
function baseTransaksi(t={}){ const today=todayISO(); return {
  tanggal: t.tanggal||today, username:t.username||'', nama:t.nama||'', jenis:t.jenis||'setoran',
  metode:t.metode||'tunai', nominal:Number(t.nominal||IURAN), catatan:t.catatan||'', status:t.status||undefined
}; }
function openEditor(id){
  if(!isAdmin) return;
  const isEdit=!!id; const data=isEdit?baseTransaksi(transaksi[id]):baseTransaksi();
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
    </div>`,
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
  if(!isAdmin) return;
  confirmBox('Hapus transaksi?','Tindakan ini tidak bisa dibatalkan.').then(res=>{
    if(res.isConfirmed) db.ref('transaksi/'+id).remove().then(()=>toast('success','Dihapus'));
  });
}
$('#btnAddCash')?.addEventListener('click', ()=>openEditor());
$('#btnPengeluaran')?.addEventListener('click', ()=>{ openEditor(); setTimeout(()=>{ $('#f_jenis').value='pengeluaran'; $('#f_metode').value='tunai'; },50); });

/* ========= QRIS: ajukan (anggota) ========= */
$('#btnQRIS')?.addEventListener('click', ()=>{
  Swal.fire({
    title:'Ajukan Pembayaran QRIS',
    html: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <img src="assets/qris.png" alt="QRIS" style="width:100%;border-radius:12px;border:1px dashed #d5dbff;padding:6px;background:#fafbff" />
          <div class="muted" style="margin-top:6px">Scan QR lalu isi nominal & keterangan.</div>
        </div>
        <div>
          <label>Nama</label>
          <input id="q_nama" class="swal2-input" value="${me.nama||me.username}" disabled>
          <label>Nominal (Rp)</label>
          <input id="q_nom" class="swal2-input" type="number" min="1000" value="${IURAN}">
          <label>Keterangan</label>
          <input id="q_cat" class="swal2-input" placeholder="misal: bayar minggu ke-3">
        </div>
      </div>
    `,
    width:760, showCancelButton:true, confirmButtonText:'Ajukan Pembayaran',
    preConfirm:()=>{
      const nominal = Number($('#q_nom').value||0);
      const catatan = ($('#q_cat').value||'').trim();
      if(nominal<=0){ Swal.showValidationMessage('Nominal harus lebih dari 0'); return false; }
      return { nominal, catatan };
    }
  }).then(r=>{
    if(!r.value) return;
    const payload = {
      id: db.ref('transaksi').push().key,
      tanggal: todayISO(),
      username: me.username,
      nama: me.nama || me.username,
      jenis: 'qris',
      metode: 'QRIS',
      nominal: r.value.nominal,
      catatan: r.value.catatan,
      status: 'pending'
    };
    db.ref('transaksi/'+payload.id).set(payload).then(()=> toast('success','Pengajuan dikirim. Menunggu konfirmasi admin.'));
  });
});

/* ========= QRIS: konfirmasi admin ========= */
function renderQRISPending(){
  const tbody = $('#tbodyQRIS'); if(!tbody) return;
  tbody.innerHTML='';
  transaksiArray().filter(t=>t.jenis==='qris' && t.status==='pending').forEach(t=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td>${t.nama}</td>
      <td class="right">${money(t.nominal)}</td>
      <td>${t.catatan||''}</td>
      <td><span class="badge warn">pending</span></td>
      <td>
        ${isAdmin ? `
          <button class="btn small" data-approve="${t.id}">Konfirmasi</button>
          <button class="btn small danger" data-reject="${t.id}">Tolak</button>
        ` : '-'}
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick=(e)=>{
    const a=e.target.closest('button[data-approve]'); const r=e.target.closest('button[data-reject]');
    if(!isAdmin) return;
    if(a){
      const id=a.dataset.approve;
      db.ref('transaksi/'+id+'/status').set('approved').then(()=>toast('success','QRIS disetujui'));
    }else if(r){
      const id=r.dataset.reject;
      db.ref('transaksi/'+id+'/status').set('rejected').then(()=>toast('success','QRIS ditolak'));
    }
  };
}

/* ========= rekap ========= */
function sumByUserInRange(uname, start, end){
  let sum=0;
  transaksiArray().forEach(t=>{
    if(t.username!==uname) return;
    const d=new Date(t.tanggal);
    const masuk = (t.jenis==='setoran') || (t.jenis==='qris' && t.status==='approved');
    if(d>=start && d<=end && masuk) sum += Number(t.nominal||0);
  });
  return sum;
}
function periodRange(mode, iso){
  const d=new Date(iso||todayISO());
  if(mode==='day') return [startOfDay(d), endOfDay(d)];
  if(mode==='week') return [startOfWeek(d), endOfWeek(d)];
  if(mode==='month') return [startOfMonth(d), endOfMonth(d)];
  if(mode==='year') return [startOfYear(d), endOfYear(d)];
  return [startOfWeek(d), endOfWeek(d)];
}
function renderRekap(){
  const mode=$('#rekapMode').value;
  const date=$('#rekapDate').value||todayISO();
  const [start,end]=periodRange(mode,date);
  const q = ($('#cariNamaRekap').value||'').toLowerCase();
  const tbody=$('#tbodyRekap'); tbody.innerHTML='';
  Object.values(users).filter(u=>u.role!=='admin' && u.aktif!==false)
    .filter(u=>!q || u.nama.toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q))
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

/* ========= export ========= */
$('#exportExcel').onclick = ()=>{
  const rows = [['Tanggal','Nama','Jenis','Metode','Nominal','Catatan','Status']];
  transaksiArray().forEach(t=>{
    rows.push([t.tanggal, t.nama, t.jenis, t.metode||'-', t.nominal, t.catatan||'', t.status||'']);
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  XLSX.writeFile(wb, 'transaksi_kas_if24a.xlsx');
};

$('#exportPDF').onclick = ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Transaksi Kas IF 24-A', 14, 14);
  const rows = transaksiArray().map(t=>[
    new Date(t.tanggal).toLocaleDateString('id-ID'), t.nama, t.jenis, t.metode||'-', money(t.nominal), t.catatan||'', t.status||''
  ]);
  doc.autoTable({ head:[['Tanggal','Nama','Jenis','Metode','Nominal','Catatan','Status']], body: rows, startY: 20 });
  doc.save('transaksi_kas_if24a.pdf');
};

$('#exportRekapPDF').onclick = ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Rekap Iuran IF 24-A', 14, 14);
  const body = Array.from($('#tbodyRekap').children).map(tr=>{
    const tds = tr.querySelectorAll('td'); return [tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText];
  });
  doc.autoTable({ head:[['Nama','Terbayar','Sisa','Status']], body, startY: 20 });
  doc.save('rekap_kas_if24a.pdf');
};

/* ========= global render ========= */
function renderAll(){ $('#iuranLabel').textContent = money(IURAN); renderRekap(); }
function renderEverything(){ renderTransaksi(); renderQRISPending(); renderAll(); }

/* ========= init ========= */
Promise.all([loadSettings(), loadUsers()]).then(()=>{
  db.ref('transaksi').on('value', s=>{ transaksi=s.val()||{}; renderEverything(); });
  renderEverything();
});
