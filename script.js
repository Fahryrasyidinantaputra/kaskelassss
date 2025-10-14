/*************************************************
 * Kas Kelas UBP — SCRIPT.JS (CDN Firebase)
 *************************************************/

/* ========= STATE ========= */
let activeUser = JSON.parse(localStorage.getItem('activeUser') || 'null');
const db = firebase.database();
const storage = firebase.storage();

let dataKas = [];       // list transaksi
let pendingQRIS = [];   // list pending qris
let aktivitasLogs = []; // list log

/* ========= UTIL ========= */
const rupiah = n => 'Rp ' + (n || 0).toLocaleString('id-ID');
const todayStr = () => new Date().toLocaleDateString('id-ID');
const notif = (icon, text) => Swal.fire({ icon, text, timer: 1400, showConfirmButton: false });

/* ========= AUTH ========= */
function logout(){
  localStorage.removeItem('activeUser');
  location.replace('login.html');
}
window.logout = logout;

function applyRoleUI(){
  const role = activeUser?.role || 'guest';
  const badge = document.getElementById('userBadge');
  if (badge) badge.textContent = `${activeUser?.username || '—'} (${role})`;

  const note = document.getElementById('permNote');
  if (note) note.textContent = (role === 'admin')
    ? 'Anda login sebagai ADMIN: dapat menambah, menghapus transaksi dan konfirmasi QRIS.'
    : 'Anda login sebagai ANGGOTA: hanya dapat melihat data dan mengajukan pembayaran via QRIS.';

  const formTrans = document.getElementById('formTransaksi');
  const aksiHead  = document.getElementById('aksiHead');
  if (role === 'anggota') {
    if (formTrans) formTrans.style.display = 'none';
    if (aksiHead)  aksiHead.style.display  = 'none';
  } else {
    if (formTrans) formTrans.style.display = 'grid';
    if (aksiHead)  aksiHead.style.display  = '';
  }
}

/* ========= NAV ========= */
document.querySelectorAll('.navlink')?.forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll('.navlink').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.section;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    if(target==='dashboard') renderDashboard(), renderTrend();
    if(target==='transaksi') renderTable(), renderTotalKategori();
    if(target==='qris') renderPendingQRIS();
    if(target==='laporan') tampilRekap();
    if(target==='aktivitas') renderAktivitas();
  };
});

/* ========= LOG AKTIVITAS ========= */
function addLog(aksi, detail){
  db.ref('logs').push({
    waktu: new Date().toLocaleString('id-ID'),
    user: activeUser?.username || 'unknown',
    aksi, detail
  });
}
function renderAktivitas(){
  const box = document.getElementById('aktivitasList');
  if(!box) return;
  box.innerHTML = '';
  aktivitasLogs.slice().reverse().forEach(l=>{
    const div = document.createElement('div');
    div.innerHTML = `<b>${l.waktu}</b> — ${l.user} <i>${l.aksi}</i> ${l.detail || ''}`;
    box.appendChild(div);
  });
}

/* ========= TRANSAKSI ========= */
function clearTransForm(){
  ['nama','keterangan','jumlah'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const t=document.getElementById('tipe'); if(t) t.value='pemasukan';
  const k=document.getElementById('kategori'); if(k) k.value='Kas Rutin';
}
function tambahTransaksi(){
  if(activeUser?.role !== 'admin') return notif('error','Hanya ADMIN.');
  const nama = document.getElementById('nama').value.trim();
  const tipe = document.getElementById('tipe').value;
  const kategori = document.getElementById('kategori').value || 'Kas Rutin';
  const ket = document.getElementById('keterangan').value.trim();
  const jumlah = parseInt(document.getElementById('jumlah').value,10);
  if(!nama || !jumlah) return notif('warning','Nama & jumlah wajib diisi.');

  db.ref('transaksi').push({ tanggal: todayStr(), nama, tipe, kategori, ket, jumlah, source:'Manual' })
    .then(()=>{ addLog('Tambah Transaksi', `${nama} (${tipe}) Rp${jumlah}`); notif('success','Transaksi tersimpan.'); clearTransForm(); });
}
window.tambahTransaksi = tambahTransaksi;

function hapusTransaksi(id){
  if(activeUser?.role !== 'admin') return notif('error','Hanya ADMIN.');
  Swal.fire({icon:'warning',text:'Hapus transaksi ini?',showCancelButton:true,confirmButtonText:'Hapus'})
  .then(res=>{
    if(!res.isConfirmed) return;
    db.ref('transaksi/'+id).remove()
      .then(()=>{ addLog('Hapus Transaksi', id); notif('success','Dihapus.'); })
      .catch(()=>notif('error','Gagal menghapus'));
  });
}
window.hapusTransaksi = hapusTransaksi;

function renderTable(){
  const body = document.getElementById('tabelKasBody');
  if(!body) return;
  body.innerHTML='';
  const role = activeUser?.role;
  dataKas.slice().reverse().forEach(item=>{
    const tr=document.createElement('tr');
    const aksi = (role==='admin') ? `<button class="btn-small btn-danger" onclick="hapusTransaksi('${item.id}')">Hapus</button>` : '-';
    tr.innerHTML = `
      <td>${item.tanggal}</td>
      <td>${item.nama}</td>
      <td>${item.tipe}</td>
      <td>${item.kategori}</td>
      <td>${item.ket||'-'}</td>
      <td>${rupiah(item.jumlah)}</td>
      <td>${aksi}</td>`;
    body.appendChild(tr);
  });
}

function renderTotalKategori(){
  const box=document.getElementById('totalKategori'); if(!box) return;
  const sum={};
  dataKas.forEach(t=>{ sum[t.kategori] = (sum[t.kategori]||0) + (t.jumlah||0); });
  box.innerHTML = Object.entries(sum).map(([k,v])=>`${k}: <b>${rupiah(v)}</b>`).join(' • ');
}

/* ========= QRIS ========= */
async function ajukanQRIS(){
  const nama = document.getElementById('qrisNama').value.trim();
  const nominal = parseInt(document.getElementById('qrisNominal').value,10);
  const ket = document.getElementById('qrisKeterangan').value.trim();
  const file = document.getElementById('qrisBukti')?.files?.[0];
  if(!nama||!nominal) return notif('warning','Nama & nominal wajib.');

  let buktiURL = '';
  if(file){
    const path = `bukti/${Date.now()}_${file.name}`;
    await storage.ref(path).put(file);
    buktiURL = await storage.ref(path).getDownloadURL();
  }
  await db.ref('pending_qris').push({ nama, nominal, ket, tanggal: todayStr(), status:'PENDING', metode:'QRIS', bukti:buktiURL });
  addLog('Ajukan QRIS', `${nama} Rp${nominal}`);
  notif('success','Permintaan dikirim.');
  ['qrisNama','qrisNominal','qrisKeterangan'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  if(document.getElementById('qrisBukti')) document.getElementById('qrisBukti').value='';
}
window.ajukanQRIS = ajukanQRIS;

function renderPendingQRIS(){
  const body=document.getElementById('pendingBody'); if(!body) return;
  body.innerHTML='';
  pendingQRIS.slice().reverse().forEach(item=>{
    const isAdmin = activeUser?.role==='admin';
    const bukti = item.bukti ? `<a href="${item.bukti}" target="_blank">Lihat</a>` : '-';
    const action = (isAdmin && item.status==='PENDING')
      ? `<button class="btn-small btn-success" onclick="konfirmasiQRIS('${item.id}')">Konfirmasi</button>` : '-';
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${rupiah(item.nominal)}</td>
      <td>${item.ket||'-'}</td>
      <td>${bukti}</td>
      <td>${item.status}</td>
      <td>${action}</td>`;
    body.appendChild(tr);
  });
}

function konfirmasiQRIS(id){
  if(activeUser?.role!=='admin') return notif('error','Hanya ADMIN.');
  const item = pendingQRIS.find(x=>x.id===id);
  if(!item) return notif('error','Data tidak ditemukan.');
  // pindahkan ke transaksi
  db.ref('transaksi').push({
    tanggal: todayStr(),
    nama: item.nama,
    tipe: 'pemasukan',
    kategori: 'QRIS',
    ket: item.ket || 'Pembayaran via QRIS',
    jumlah: item.nominal,
    source: 'QRIS'
  })
  .then(()=>db.ref('pending_qris/'+id).remove())
  .then(()=>{ addLog('Konfirmasi QRIS', item.nama); notif('success','Dikonfirmasi.'); })
  .catch(()=>notif('error','Gagal konfirmasi.'));
}
window.konfirmasiQRIS = konfirmasiQRIS;

/* ========= LAPORAN ========= */
function tampilRekap(){
  const tbody=document.getElementById('rekapBody'); if(!tbody) return;
  tbody.innerHTML='';
  const byDate={};
  dataKas.forEach(t=>{ (byDate[t.tanggal] ||= []).push(t); });

  Object.entries(byDate).forEach(([tgl,list])=>{
    let inSum=0,outSum=0;
    list.forEach(l=>{ if(l.tipe==='pemasukan') inSum+=l.jumlah; else outSum+=l.jumlah; });
    const saldo=inSum-outSum;

    list.forEach((l,idx)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${idx===0?tgl:''}</td>
        <td>${l.nama}</td>
        <td>${l.kategori}</td>
        <td>${l.tipe==='pemasukan'?rupiah(l.jumlah):'-'}</td>
        <td>${l.tipe==='pengeluaran'?rupiah(l.jumlah):'-'}</td>
        <td>${idx===0?rupiah(saldo):''}</td>`;
      tbody.appendChild(tr);
    });
  });
}

/* ========= DASHBOARD CHARTS ========= */
let miniChartInstance=null, trendChartInstance=null;

function renderDashboard(){
  const inSum  = dataKas.filter(i=>i.tipe==='pemasukan').reduce((a,b)=>a+b.jumlah,0);
  const outSum = dataKas.filter(i=>i.tipe==='pengeluaran').reduce((a,b)=>a+b.jumlah,0);
  const saldo  = inSum - outSum;

  const setTxt=(id,val)=>{const el=document.getElementById(id); if(el) el.textContent=val;};
  setTxt('sumIn',rupiah(inSum)); setTxt('sumOut',rupiah(outSum)); setTxt('sumSaldo',rupiah(saldo));

  const cv=document.getElementById('miniChart');
  if(cv){
    if(miniChartInstance) miniChartInstance.destroy();
    miniChartInstance = new Chart(cv,{
      type:'doughnut',
      data:{ labels:['Pemasukan','Pengeluaran'], datasets:[{ data:[inSum,outSum], backgroundColor:['#4cc9f0','#f72585'], borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'65%', plugins:{legend:{display:false}} }
    });
  }
}

function renderTrend(){
  const el=document.getElementById('trendChart'); if(!el) return;
  // urutkan tanggal
  const days=[...new Set(dataKas.map(d=>d.tanggal))].sort((a,b)=>{
    const A=a.split('/').reverse().join(''), B=b.split('/').reverse().join('');
    return A.localeCompare(B);
  });
  // saldo kumulatif
  let running=0;
  const saldoHarian=days.map(d=>{
    const delta=dataKas.filter(x=>x.tanggal===d).reduce((acc,t)=>acc+(t.tipe==='pemasukan'?t.jumlah:-t.jumlah),0);
    running += delta; return running;
  });

  if(trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(el,{
    type:'line',
    data:{ labels:days, datasets:[{ label:'Saldo Harian', data:saldoHarian, tension:.35 }] },
    options:{ responsive:true, plugins:{legend:{display:true}}, scales:{y:{beginAtZero:true}} }
  });
}

/* ========= EXPORT ========= */
function exportExcel(){ const ws = XLSX.utils.json_to_sheet(dataKas); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Transaksi"); XLSX.writeFile(wb, "LaporanKas.xlsx"); }
function exportPDF(){ const { jsPDF } = window.jspdf; const doc=new jsPDF(); doc.text("Laporan Kas Kelas",14,16); dataKas.forEach((t,i)=>{doc.text(`${i+1}. ${t.tanggal} • ${t.nama} • ${t.tipe} • ${rupiah(t.jumlah)}`,14,26+i*6);}); doc.save("LaporanKas.pdf"); }
const btnX1=document.getElementById('btnExportXls'); if(btnX1) btnX1.onclick=exportExcel;
const btnP1=document.getElementById('btnExportPdf'); if(btnP1) btnP1.onclick=exportPDF;
const btnX2=document.getElementById('btnExportXls2'); if(btnX2) btnX2.onclick=exportExcel;
const btnP2=document.getElementById('btnExportPdf2'); if(btnP2) btnP2.onclick=exportPDF;

/* ========= REALTIME LISTENERS ========= */
function listenTransaksi(){
  db.ref('transaksi').on('value', snap=>{
    const data = snap.val();
    dataKas = data ? Object.entries(data).map(([id,val])=>({id,...val})) : [];
    renderTable(); renderTotalKategori(); renderDashboard(); renderTrend();
  });
}
function listenPending(){
  db.ref('pending_qris').on('value', snap=>{
    const data = snap.val();
    pendingQRIS = data ? Object.entries(data).map(([id,val])=>({id,...val})) : [];
    renderPendingQRIS();
  });
}
function listenLogs(){
  db.ref('logs').on('value', snap=>{
    const data = snap.val();
    aktivitasLogs = data ? Object.entries(data).map(([id,val])=>({id,...val})) : [];
    renderAktivitas();
  });
}

/* ========= INIT ========= */
(function init(){
  if(!activeUser){ location.replace('login.html'); return; }
  applyRoleUI();
  listenTransaksi();
  listenPending();
  listenLogs();
  renderDashboard();
})();
