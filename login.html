/* ========= Util ========= */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const fmt = (n)=>new Intl.NumberFormat('id-ID').format(n);
const money = (n)=>`Rp ${fmt(Number(n||0))}`;
const toast = (icon,text)=>Swal.fire({icon,text,timer:1400,showConfirmButton:false});
const confirmBox=(title,text)=>Swal.fire({icon:'warning',title,text,showCancelButton:true,confirmButtonText:'Ya',cancelButtonText:'Batal'});

/* ========= Auth ========= */
const me = JSON.parse(localStorage.getItem('activeUser')||'null');
if(!me){ location.href='login.html'; }
$('#whoami').textContent = me?.nama || me?.username || '-';
$('#logout').onclick = ()=>{ localStorage.removeItem('activeUser'); location.href='login.html'; };
const isAdmin = (me?.role==='admin');
if(!isAdmin){ $('#adminActions')?.remove(); $$('.admin-only').forEach(el=>el.remove()); }

/* ========= Dates & Period ========= */
const BULAN=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const todayISO = ()=> new Date().toISOString().slice(0,10);
function startOfDay(d){const dt=new Date(d);dt.setHours(0,0,0,0);return dt;}
function endOfDay(d){const dt=new Date(d);dt.setHours(23,59,59,999);return dt;}
function startOfMonthIdx(y,m){const d=new Date(y,m,1);d.setHours(0,0,0,0);return d;}
function endOfMonthIdx(y,m){const d=new Date(y,m+1,0);d.setHours(23,59,59,999);return d;}
function startOfYear(d){const y=(d instanceof Date)?d.getFullYear():d;return new Date(y,0,1,0,0,0,0);}
function endOfYear(d){const y=(d instanceof Date)?d.getFullYear():d;return new Date(y,11,31,23,59,59,999);}

/* ========= State ========= */
let IURAN = DEFAULT_IURAN;
let START_WEEK = null;
let users = {};
let transaksi = {};

function setPeriodeInfo(){
  const y = Number($('#selTahun').value||new Date().getFullYear());
  const m = Number($('#selBulan').value||new Date().getMonth());
  $('#periodeInfo').textContent = `${BULAN[m]} ${y}`;
}

/* ========= Settings ========= */
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
  db.ref('settings').set({iuran:i, start_week:st}).then(()=>{ toast('success','Pengaturan disimpan'); loadSettings(); });
});
$('#btnReloadPengaturan')?.addEventListener('click', ()=>loadSettings());

/* ========= Users ========= */
function loadUsers(){
  return db.ref('users').once('value').then(s=>{ users=s.val()||{}; renderAnggota(); });
}

function renderAnggota(){
  const q = ($('#cariAnggota')?.value||'').toLowerCase();
  const tbody = $('#tbodyAnggota');
  tbody.innerHTML = '';

  const list = Object.values(users)
    .filter(u => u.role !== 'admin')
    .filter(u => !q || u.nama.toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q))
    .sort((a,b) => a.nama.localeCompare(b.nama, 'id'));

  // tampilkan jumlah anggota
  $('#countAnggota').textContent = list.length;

  list.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="NIM">${u.username||''}</td>
      <td data-label="Nama">${u.nama||''}</td>
      <td data-label="Email">${u.email||''}</td>
      <td data-label="Role">${u.role||''}</td>
      <td data-label="Aksi">
        ${isAdmin ? `
          <button class="btn small" data-act="reset" data-id="${u.username}">Reset PW</button>
          <button class="btn small" data-act="toggle" data-id="${u.username}">${u.aktif===false?'Aktifkan':'Nonaktifkan'}</button>
          <button class="btn small danger" data-act="hapus" data-id="${u.username}">Hapus</button>`
        : (me.username===u.username ? `<button class="btn small" data-act="pw" data-id="${u.username}">Ganti Password</button>` : '')}
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = (e) => {
    const b = e.target.closest('button');
    if(!b) return;
    const act = b.dataset.act;
    const id = b.dataset.id;
    if(act === 'pw') {
      Swal.fire({
        title:'Ganti Password',
        input:'text',
        inputPlaceholder:'Masukkan password baru',
        showCancelButton:true
      }).then(r=>{
        if(r.value) {
          db.ref('users/'+id+'/password').set(r.value).then(()=>toast('success','Password diperbarui'));
        }
      });
    }
    if(!isAdmin) return;
    if(act === 'reset') {
      const email = users[id]?.email || '';
      if(!email) return toast('error','Email kosong');
      db.ref('users/'+id+'/password').set(email).then(()=>toast('success','Password direset ke email'));
    } else if(act === 'toggle') {
      const newAktif = users[id].aktif === false ? true : false;
      db.ref('users/'+id+'/aktif').set(newAktif).then(()=>{ toast('success','Status diubah'); loadUsers(); });
    } else if(act === 'hapus') {
      Swal.fire({
        icon:'warning',
        title:'Hapus Anggota?',
        text:'Data anggota akan dihapus permanen.',
        showCancelButton:true,
        confirmButtonText:'Ya, hapus'
      }).then(r=>{
        if(r.isConfirmed) {
          db.ref('users/'+id).remove().then(()=> {
            toast('success','Anggota dihapus');
            loadUsers();
          });
        }
      });
    }
  };
}

/* ========= Nav ========= */
$$('.menu a').forEach(a=>{
  a.onclick=()=>{
    $$('.menu a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    $$('.page').forEach(x=>x.classList.remove('active'));
    $('#page-'+a.dataset.page).classList.add('active');
  };
});

/* ========= Select Bulan/Tahun ========= */
function populateMonthYearSelects(){
  const yNow=new Date().getFullYear(), mNow=new Date().getMonth();
  const bulanOpt=BULAN.map((b,i)=>`<option value="${i}" ${i===mNow?'selected':''}>${b}</option>`).join('');
  const tahunOpt=Array.from({length:6},(_,k)=>2025+k).map(y=>`<option value="${y}" ${y===yNow?'selected':''}>${y}</option>`).join('');
  if($('#selBulan')) $('#selBulan').innerHTML=bulanOpt;
  if($('#selTahun')) $('#selTahun').innerHTML=tahunOpt;
  if($('#rekapBulan')) $('#rekapBulan').innerHTML=bulanOpt;
  if($('#rekapTahun')) $('#rekapTahun').innerHTML=tahunOpt;

  $('#rekapScope')?.addEventListener('change', ()=>{
    const scope = $('#rekapScope').value;
    $('#rekapBulan').style.display = scope==='bulan' ? '' : 'none';
    renderRekap();
  });

  $('#selBulan')?.addEventListener('change', ()=>{ setPeriodeInfo(); renderTransaksi(); });
  $('#selTahun')?.addEventListener('change', ()=>{ setPeriodeInfo(); renderTransaksi(); });
  $('#rekapBulan')?.addEventListener('change', renderRekap);
  $('#rekapTahun')?.addEventListener('change', renderRekap);
  setPeriodeInfo();
}

/* ========= Transaksi ========= */
function transaksiArray(){ return Object.entries(transaksi).map(([id,t])=>({id,...t})).sort((a,b)=> (a.tanggal>b.tanggal?-1:1)); }

function renderTransaksi(){
  let arr = transaksiArray();
  const m = Number($('#selBulan')?.value ?? new Date().getMonth());
  const y = Number($('#selTahun')?.value ?? new Date().getFullYear());
  const start = startOfMonthIdx(y,m), end = endOfMonthIdx(y,m);
  arr = arr.filter(t=>{ const d=new Date(t.tanggal); return d>=start && d<=end; });

  const q = ($('#search').value||'').toLowerCase();
  if(q){
    arr = arr.filter(t=>
      (t.nama||'').toLowerCase().includes(q) ||
      (t.username||'').toLowerCase().includes(q) ||
      (t.catatan||'').toLowerCase().includes(q));
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
      <td data-label="Tanggal">${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td data-label="Nama">${t.nama||''}</td>
      <td data-label="Jenis"><span class="badge ${t.jenis==='pengeluaran'?'danger':''}">${t.jenis}</span></td>
      <td data-label="Metode">${t.metode||'-'}</td>
      <td data-label="Nominal" class="right">${money(t.nominal)}</td>
      <td data-label="Catatan">${t.catatan||''}</td>
      <td data-label="Status">${statusBadge}</td>
      <td data-label="Aksi">
        ${isAdmin && t.status!=='pending' ? `<button class="btn small" data-edit="${t.id}">Edit</button>` : ''}
        ${isAdmin ? `<button class="btn small danger" data-del="${t.id}">Hapus</button>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });
  $('#empty').style.display = has?'none':'block';

  // saldo
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

/* ========= TAMBAH SETORAN (ADMIN) ========= */
$('#btnAddCash')?.addEventListener('click', ()=>{
  if(!isAdmin) return toast('error', 'Hanya admin yang bisa menambah setoran');
  
  // Ambil daftar anggota untuk dropdown
  const anggotaOptions = Object.values(users)
    .filter(u => u.role !== 'admin' && u.aktif !== false)
    .sort((a,b) => a.nama.localeCompare(b.nama, 'id'))
    .map(u => `<option value="${u.username}">${u.nama} (${u.username})</option>`)
    .join('');

  Swal.fire({
    title: '💰 Tambah Setoran',
    html: `
      <div style="text-align:left;">
        <label style="display:block;margin-top:10px;font-weight:600;">Pilih Anggota</label>
        <select id="setor_user" class="swal2-input" style="width:100%;">
          <option value="">-- Pilih Anggota --</option>
          ${anggotaOptions}
        </select>
        
        <label style="display:block;margin-top:10px;font-weight:600;">Nominal (Rp)</label>
        <input id="setor_nom" class="swal2-input" type="number" min="1000" value="${IURAN}" style="width:100%;">
        
        <label style="display:block;margin-top:10px;font-weight:600;">Metode Pembayaran</label>
        <select id="setor_metode" class="swal2-input" style="width:100%;">
          <option value="Tunai">Tunai</option>
          <option value="Transfer">Transfer</option>
          <option value="QRIS">QRIS</option>
        </select>
        
        <label style="display:block;margin-top:10px;font-weight:600;">Keterangan (opsional)</label>
        <input id="setor_cat" class="swal2-input" placeholder="Contoh: iuran minggu ke-1" style="width:100%;">
      </div>
    `,
    width: 500,
    showCancelButton: true,
    confirmButtonText: 'Tambah Setoran',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const username = $('#setor_user').value;
      const nominal = Number($('#setor_nom').value || 0);
      const metode = $('#setor_metode').value;
      const catatan = $('#setor_cat').value.trim();
      
      if (!username) {
        Swal.showValidationMessage('Pilih anggota terlebih dahulu');
        return false;
      }
      if (nominal <= 0) {
        Swal.showValidationMessage('Nominal harus lebih dari 0');
        return false;
      }
      
      return { username, nominal, metode, catatan };
    }
  }).then(r => {
    if (!r.value) return;
    const { username, nominal, metode, catatan } = r.value;
    const user = users[username];
    
    const payload = {
      tanggal: todayISO(),
      username: username,
      nama: user.nama || username,
      jenis: 'setoran',
      metode: metode,
      nominal: nominal,
      catatan: catatan,
      status: 'approved'
    };
    
    const newKey = db.ref('transaksi').push().key;
    db.ref('transaksi/' + newKey).set(payload).then(() => {
      toast('success', 'Setoran berhasil ditambahkan');
    });
  });
});

/* ========= TAMBAH PENGELUARAN (ADMIN) ========= */
$('#btnPengeluaran')?.addEventListener('click', ()=>{
  if(!isAdmin) return toast('error', 'Hanya admin yang bisa menambah pengeluaran');
  
  Swal.fire({
    title: '💸 Tambah Pengeluaran',
    html: `
      <div style="text-align:left;">
        <label style="display:block;margin-top:10px;font-weight:600;">Nominal (Rp)</label>
        <input id="keluar_nom" class="swal2-input" type="number" min="1000" value="50000" style="width:100%;">
        
        <label style="display:block;margin-top:10px;font-weight:600;">Keperluan</label>
        <input id="keluar_cat" class="swal2-input" placeholder="Contoh: Snack rapat kelas" style="width:100%;">
        
        <label style="display:block;margin-top:10px;font-weight:600;">Metode Pembayaran</label>
        <select id="keluar_metode" class="swal2-input" style="width:100%;">
          <option value="Tunai">Tunai</option>
          <option value="Transfer">Transfer</option>
          <option value="QRIS">QRIS</option>
        </select>
      </div>
    `,
    width: 500,
    showCancelButton: true,
    confirmButtonText: 'Tambah Pengeluaran',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const nominal = Number($('#keluar_nom').value || 0);
      const catatan = $('#keluar_cat').value.trim();
      const metode = $('#keluar_metode').value;
      
      if (nominal <= 0) {
        Swal.showValidationMessage('Nominal harus lebih dari 0');
        return false;
      }
      if (!catatan) {
        Swal.showValidationMessage('Keperluan wajib diisi');
        return false;
      }
      
      return { nominal, catatan, metode };
    }
  }).then(r => {
    if (!r.value) return;
    const { nominal, catatan, metode } = r.value;
    
    const payload = {
      tanggal: todayISO(),
      username: me.username,
      nama: me.nama || me.username,
      jenis: 'pengeluaran',
      metode: metode,
      nominal: nominal,
      catatan: catatan,
      status: 'approved'
    };
    
    const newKey = db.ref('transaksi').push().key;
    db.ref('transaksi/' + newKey).set(payload).then(() => {
      toast('success', 'Pengeluaran berhasil ditambahkan');
    });
  });
});

/* ========= EDIT TRANSAKSI ========= */
function openEditor(id) {
  if (!isAdmin) return;
  const t = transaksi[id];
  if (!t) return;

  Swal.fire({
    title: 'Edit Transaksi',
    html: `
      <div style="text-align:left;">
        <label style="display:block;margin-top:10px;font-weight:600;">Nominal (Rp)</label>
        <input id="edit_nom" class="swal2-input" type="number" value="${t.nominal}" style="width:100%;">
        
        <label style="display:block;margin-top:10px;font-weight:600;">Catatan</label>
        <input id="edit_cat" class="swal2-input" value="${t.catatan || ''}" style="width:100%;">
      </div>
    `,
    width: 500,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const nominal = Number($('#edit_nom').value || 0);
      const catatan = $('#edit_cat').value.trim();
      
      if (nominal <= 0) {
        Swal.showValidationMessage('Nominal harus lebih dari 0');
        return false;
      }
      
      return { nominal, catatan };
    }
  }).then(r => {
    if (!r.value) return;
    const { nominal, catatan } = r.value;
    
    db.ref('transaksi/' + id).update({ nominal, catatan }).then(() => {
      toast('success', 'Transaksi berhasil diupdate');
    });
  });
}

/* ========= DELETE TRANSAKSI ========= */
function deleteTransaksi(id) {
  if (!isAdmin) return;
  
  confirmBox('Hapus Transaksi?', 'Data transaksi akan dihapus permanen.').then(r => {
    if (r.isConfirmed) {
      db.ref('transaksi/' + id).remove().then(() => {
        toast('success', 'Transaksi berhasil dihapus');
      });
    }
  });
}

/* ========= QRIS: Ajukan (anggota) ========= */
$('#btnQRIS')?.addEventListener('click', ()=>{
  Swal.fire({
    title:'💳 Ajukan Pembayaran QRIS',
    html: `
      <div style="display:flex;flex-direction:column;gap:20px;align-items:center;">
        <div style="text-align:center;">
          <img src="assets/qris.jpg" alt="QRIS" style="max-width:250px;width:100%;border-radius:12px;box-shadow:0 0 10px rgba(0,0,0,0.15);margin-bottom:8px;" />
          <div style="font-size:13px;color:#555;">Scan QR ini untuk membayar iuran.</div>
        </div>
        <div style="width:100%;text-align:left;">
          <label style="display:block;margin-top:10px;font-weight:600;">Nama</label>
          <input id="q_nama" class="swal2-input" value="${me.nama||me.username}" disabled style="width:100%;">
          
          <label style="display:block;margin-top:10px;font-weight:600;">Nominal (Rp)</label>
          <input id="q_nom" class="swal2-input" type="number" min="1000" value="${IURAN}" style="width:100%;">
          
          <label style="display:block;margin-top:10px;font-weight:600;">Keterangan</label>
          <input id="q_cat" class="swal2-input" placeholder="Contoh: iuran minggu ke-3" style="width:100%;">
        </div>
      </div>
    `,
    width: 550,
    showCancelButton:true,
    confirmButtonText:'Ajukan Pembayaran',
    cancelButtonText:'Batal',
    preConfirm:()=>{
      const nominal = Number($('#q_nom').value||0);
      const catatan = ($('#q_cat').value||'').trim();
      if(nominal<=0){ Swal.showValidationMessage('Nominal harus lebih dari 0'); return false; }
      return { nominal, catatan };
    }
  }).then(r=>{
    if(!r.value) return;
    const payload = {
      tanggal: todayISO(),
      username: me.username,
      nama: me.nama || me.username,
      jenis: 'qris',
      metode: 'QRIS',
      nominal: r.value.nominal,
      catatan: r.value.catatan,
      status: 'pending'
    };
    const newKey = db.ref('transaksi').push().key;
    db.ref('transaksi/'+newKey).set(payload).then(()=> toast('success','Pengajuan dikirim. Menunggu konfirmasi admin.'));
  });
});

/* ========= QRIS: Konfirmasi (admin) ========= */
function renderQRISPending(){
  const tbody = $('#tbodyQRIS'); if(!tbody) return;
  tbody.innerHTML='';
  transaksiArray().filter(t=>t.jenis==='qris' && t.status==='pending').forEach(t=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Tanggal">${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td data-label="Nama">${t.nama}</td>
      <td data-label="Nominal" class="right">${money(t.nominal)}</td>
      <td data-label="Catatan">${t.catatan||''}</td>
      <td data-label="Status"><span class="badge warn">pending</span></td>
      <td data-label="Aksi">
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
    if(a){ db.ref('transaksi/'+a.dataset.approve+'/status').set('approved').then(()=>toast('success','QRIS disetujui')); }
    if(r){ db.ref('transaksi/'+r.dataset.reject+'/status').set('rejected').then(()=>toast('success','QRIS ditolak')); }
  };
}

/* ========= Rekap ========= */
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

function renderRekap(){
  const scope = $('#rekapScope').value;
  const tahun = Number($('#rekapTahun').value || new Date().getFullYear());
  const bulanIdx = Number($('#rekapBulan')?.value || new Date().getMonth());
  const tbody=$('#tbodyRekap'); tbody.innerHTML='';
  const q = ($('#cariNamaRekap').value||'').toLowerCase();
  const filterStatus = $('#filterStatus')?.value || 'all';

  let start, end, target;
  if(scope==='bulan'){
    start = startOfMonthIdx(tahun, bulanIdx);
    end   = endOfMonthIdx(tahun, bulanIdx);
    target = 4 * IURAN;
    $('#rekapTargetInfo').textContent = `Target bulanan per anggota: ${money(target)} (${fmt(4)} minggu × ${money(IURAN)})`;
  }else{
    start = startOfYear(tahun);
    end   = endOfYear(tahun);
    target = 48 * IURAN;
    $('#rekapTargetInfo').textContent = `Target tahunan per anggota: ${money(target)} (${fmt(48)} minggu × ${money(IURAN)})`;
  }

  const rows = [];
  Object.values(users).filter(u=>u.role!=='admin' && u.aktif!==false)
    .filter(u=>!q || u.nama?.toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q))
    .sort((a,b)=> a.nama?.localeCompare(b.nama,'id'))
    .forEach(u=>{
      const paid = sumByUserInRange(u.username, start, end);
      const sisa = Math.max(target - paid, 0);
      const lunas = sisa<=0;
      if(filterStatus==='lunas' && !lunas) return;
      if(filterStatus==='belum' && lunas) return;
      const status = lunas ? `<span class="badge success">Sudah Lunas</span>` : `<span class="badge danger">Belum Lunas</span>`;
      rows.push(`<tr><td data-label="Nama">${u.nama}</td><td data-label="Terbayar">${money(paid)}</td><td data-label="Sisa">${money(sisa)}</td><td data-label="Status">${status}</td></tr>`);
    });

  tbody.innerHTML = rows.join('') || `<tr><td colspan="4" class="muted" style="text-align:center;padding:12px">Tidak ada data</td></tr>`;
}

/* ========= Export ========= */
$('#exportExcel').onclick = ()=>{
  const rows = [['Tanggal','Nama','Jenis','Metode','Nominal','Catatan','Status']];
  transaksiArray().forEach(t=> rows.push([t.tanggal, t.nama, t.jenis, t.metode||'-', t.nominal, t.catatan||'', t.status||'']));
  const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi'); XLSX.writeFile(wb, 'transaksi_kas_if24a.xlsx');
};
$('#exportPDF').onclick = ()=>{
  const { jsPDF } = window.jspdf; const doc = new jsPDF();
  doc.text('Transaksi Kas IF 24-A', 14, 14);
  const rows = transaksiArray().map(t=>[
    new Date(t.tanggal).toLocaleDateString('id-ID'), t.nama, t.jenis, t.metode||'-', money(t.nominal), t.catatan||'', t.status||''
  ]);
  doc.autoTable({ head:[['Tanggal','Nama','Jenis','Metode','Nominal','Catatan','Status']], body: rows, startY: 20 });
  doc.save('transaksi_kas_if24a.pdf');
};
$('#exportRekapPDF').onclick = ()=>{
  const { jsPDF } = window.jspdf; const doc = new jsPDF();
  const scope=$('#rekapScope').value;
  doc.text(`Rekap ${scope==='bulan'?'Bulanan':'Tahunan'} IF 24-A`, 14, 14);
  const body = Array.from($('#tbodyRekap').children).map(tr=>{
    const tds = tr.querySelectorAll('td'); return [tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText];
  });
  doc.autoTable({ head:[['Nama','Terbayar','Sisa','Status']], body, startY: 20 });
  doc.save(`rekap_${scope}.pdf`);
};

/* ========= Reset Semua Transaksi ========= */
$('#btnResetAll')?.addEventListener('click', ()=>{
  if(!isAdmin) return;
  confirmBox('Reset semua transaksi?', 'Ini akan menghapus seluruh data transaksi permanen.').then(r=>{
    if(!r.isConfirmed) return;
    db.ref('transaksi').remove().then(()=> toast('success','Semua transaksi direset.'));
  });
});

/* === TAMBAH ANGGOTA (ADMIN) === */
$('#btnTambahAnggota')?.addEventListener('click', ()=>{
  if (!isAdmin) {
    return Swal.fire('Akses Ditolak', 'Hanya admin yang bisa menambah anggota.', 'error');
  }

  Swal.fire({
    title: 'Tambah Anggota Baru',
    html: `
      <div style="text-align:left;">
        <label style="display:block;margin-top:10px;font-weight:600;">Nama Lengkap</label>
        <input id="addNama" class="swal2-input" placeholder="Nama lengkap" style="width:100%;">
        
        <label style="display:block;margin-top:10px;font-weight:600;">NIM (username)</label>
        <input id="addUser" class="swal2-input" placeholder="24416255xxxxx" style="width:100%;">
        
        <label style="display:block;margin-top:10px;font-weight:600;">Email Kampus (password awal)</label>
        <input id="addEmail" class="swal2-input" placeholder="if24.nama@mhs.ubpkarawang.ac.id" style="width:100%;">
      </div>
    `,
    width: 500,
    showCancelButton: true,
    confirmButtonText: 'Tambah',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const nama = document.getElementById('addNama').value.trim();
      const username = document.getElementById('addUser').value.trim();
      const email = document.getElementById('addEmail').value.trim();
      if (!nama || !username || !email) {
        Swal.showValidationMessage('Semua field wajib diisi');
        return false;
      }
      return { nama, username, email };
    }
  }).then(result => {
    if (!result.value) return;
    const { nama, username, email } = result.value;
    db.ref('users/' + username).once('value', snap => {
      if (snap.exists()) {
        return Swal.fire('Gagal', 'NIM sudah terdaftar', 'error');
      }
      db.ref('users/' + username).set({
        nama,
        username,
        email,
        password: email,
        role: 'anggota',
        aktif: true
      }).then(() => {
        Swal.fire('Berhasil', 'Anggota baru berhasil ditambahkan!', 'success');
        loadUsers();
      });
    });
  });
});

/* ========= Init ========= */
$('#btnRefreshRekap')?.addEventListener('click', renderRekap);
$('#cariAnggota')?.addEventListener('input', renderAnggota);
$('#cariNamaRekap')?.addEventListener('input', renderRekap);
$('#filterStatus')?.addEventListener('change', renderRekap);

Promise.all([loadSettings(), loadUsers()]).then(()=>{
  populateMonthYearSelects();
  db.ref('transaksi').on('value', s=>{ transaksi=s.val()||{}; renderTransaksi(); renderQRISPending(); renderRekap(); });
  renderTransaksi(); renderQRISPending(); renderRekap();
});
