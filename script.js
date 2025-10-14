/********************
 * INIT & STATE
 ********************/
const user = JSON.parse(localStorage.getItem('activeUser') || 'null');
if(!user) { location.replace('login.html'); }
const role = user.role || 'anggota';

const toast = (icon,text)=>Swal.fire({icon,text,timer:1400,showConfirmButton:false});

let dataKas=[], pendingQRIS=[], aktivitas=[];

const rupiah = n => 'Rp ' + (n||0).toLocaleString('id-ID');
const todayStr = () => new Date().toLocaleDateString('id-ID');

/********************
 * ROLE UI + NAV
 ********************/
document.getElementById('userBadge').textContent = `${user.username} (${role})`;
document.getElementById('permNote').textContent = (role==='admin')
  ? 'Anda login sebagai ADMIN: tambah/hapus transaksi & konfirmasi QRIS.'
  : 'Anda login sebagai ANGGOTA: lihat data & ajukan QRIS.';

if(role==='anggota'){
  const f=document.getElementById('formTransaksi'); if(f) f.style.display='none';
  const h=document.getElementById('aksiHead'); if(h) h.style.display='none';
}

document.querySelectorAll('.navlink').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.navlink').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target=btn.dataset.section;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    if(target==='dashboard'){ renderDashboard(); renderTrend(); }
    if(target==='transaksi'){ renderTable(); renderTotalKategori(); }
    if(target==='qris'){ renderPendingQRIS(); }
    if(target==='laporan'){ tampilRekap(); }
    if(target==='aktivitas'){ renderAktivitas(); }
  };
});

function logout(){ localStorage.removeItem('activeUser'); location.replace('login.html'); }
window.logout = logout;

/********************
 * THEME PICKER
 ********************/
const picker=document.getElementById('themePicker');
const applyTheme=(t)=>{ document.documentElement.classList.remove('theme-indigo','theme-teal');
  if(t==='indigo') document.documentElement.classList.add('theme-indigo');
  if(t==='teal') document.documentElement.classList.add('theme-teal');
  localStorage.setItem('theme',t);
};
applyTheme(localStorage.getItem('theme')||'blue');
picker.value = localStorage.getItem('theme')||'blue';
picker.onchange=()=>applyTheme(picker.value);

/********************
 * TRANSAKSI
 ********************/
function clearTransForm(){
  ['nama','keterangan','jumlah'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  const t=document.getElementById('tipe'); if(t) t.value='pemasukan';
  const k=document.getElementById('kategori'); if(k) k.value='Kas Rutin';
}
function tambahTransaksi(){
  if(role!=='admin') return toast('error','Hanya ADMIN.');
  const nama=document.getElementById('nama').value.trim();
  const tipe=document.getElementById('tipe').value;
  const kategori=document.getElementById('kategori').value||'Kas Rutin';
  const ket=document.getElementById('keterangan').value.trim();
  const jumlah=parseInt(document.getElementById('jumlah').value,10);
  if(!nama||!jumlah) return toast('warning','Nama & jumlah wajib');
  db.ref('transaksi').push({ tanggal:todayStr(), nama, tipe, kategori, ket, jumlah, source:'Manual' })
    .then(()=>{ addLog('Tambah Transaksi', `${nama} (${tipe}) Rp${jumlah}`); toast('success','Tersimpan'); clearTransForm(); });
}
window.tambahTransaksi=tambahTransaksi;

function hapusTransaksi(id){
  if(role!=='admin') return toast('error','Hanya ADMIN.');
  Swal.fire({icon:'warning',text:'Hapus transaksi ini?',showCancelButton:true,confirmButtonText:'Hapus'})
  .then(res=>{
    if(!res.isConfirmed) return;
    db.ref('transaksi/'+id).remove()
      .then(()=>{ addLog('Hapus Transaksi', id); toast('success','Dihapus'); })
      .catch(()=>toast('error','Gagal menghapus'));
  });
}
window.hapusTransaksi=hapusTransaksi;

function renderTable(){
  const box=document.getElementById('tabelKasBody'); if(!box) return;
  const q=(document.getElementById('searchBox')?.value||'').toLowerCase();
  const list=dataKas.filter(i=>{
    return [i.nama,i.kategori,i.tipe,i.ket].some(v=>(v||'').toLowerCase().includes(q));
  }).slice().reverse();

  box.innerHTML='';
  list.forEach(it=>{
    const tr=document.createElement('tr');
    const aksi=(role==='admin')? `<button class="btn-small btn-danger" onclick="hapusTransaksi('${it.id}')">Hapus</button>` : '-';
    tr.innerHTML=`<td>${it.tanggal}</td><td>${it.nama}</td><td>${it.tipe}</td><td>${it.kategori}</td><td>${it.ket||'-'}</td><td>${rupiah(it.jumlah)}</td><td>${aksi}</td>`;
    box.appendChild(tr);
  });
}
document.getElementById('searchBox')?.addEventListener('input',renderTable);

function renderTotalKategori(){
  const box=document.getElementById('totalKategori'); if(!box) return;
  const sum={}; dataKas.forEach(t=>{ sum[t.kategori]=(sum[t.kategori]||0)+t.jumlah; });
  box.innerHTML=Object.entries(sum).map(([k,v])=>`${k}: <b>${rupiah(v)}</b>`).join(' • ');
}

/********************
 * QRIS
 ********************/
async function ajukanQRIS(){
  const nama=document.getElementById('qrisNama').value.trim();
  const nominal=parseInt(document.getElementById('qrisNominal').value,10);
  const ket=document.getElementById('qrisKeterangan').value.trim();
  const file=document.getElementById('qrisBukti')?.files?.[0];
  if(!nama||!nominal) return toast('warning','Nama & nominal wajib');

  let buktiURL='';
  if(file){
    const path=`bukti/${Date.now()}_${file.name}`;
    await storage.ref(path).put(file);
    buktiURL=await storage.ref(path).getDownloadURL();
  }
  await db.ref('pending_qris').push({ nama, nominal, ket, tanggal:todayStr(), status:'PENDING', metode:'QRIS', bukti:buktiURL });
  addLog('Ajukan QRIS', `${nama} Rp${nominal}`); toast('success','Permintaan dikirim');
  ['qrisNama','qrisNominal','qrisKeterangan'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  if(document.getElementById('qrisBukti')) document.getElementById('qrisBukti').value='';
}
window.ajukanQRIS=ajukanQRIS;

function renderPendingQRIS(){
  const body=document.getElementById('pendingBody'); if(!body) return;
  body.innerHTML='';
  pendingQRIS.slice().reverse().forEach(it=>{
    const bukti = it.bukti ? `<a href="${it.bukti}" target="_blank">Bukti</a>` : '-';
    const aksi = (role==='admin' && it.status==='PENDING') ? `<button class="btn-small btn-success" onclick="konfirmasiQRIS('${it.id}')">Konfirmasi</button>` : '-';
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${it.nama}</td><td>${rupiah(it.nominal)}</td><td>${it.ket||'-'}</td><td>${bukti}</td><td>${it.status}</td><td>${aksi}</td>`;
    body.appendChild(tr);
  });
}
function konfirmasiQRIS(id){
  if(role!=='admin') return toast('error','Hanya ADMIN.');
  const t=pendingQRIS.find(x=>x.id===id); if(!t) return toast('error','Data tidak ditemukan');
  db.ref('transaksi').push({ tanggal:todayStr(), nama:t.nama, tipe:'pemasukan', kategori:'QRIS', ket:t.ket||'Pembayaran via QRIS', jumlah:t.nominal, source:'QRIS' })
  .then(()=>db.ref('pending_qris/'+id).remove())
  .then(()=>{ addLog('Konfirmasi QRIS', t.nama); toast('success','Dikonfirmasi'); })
  .catch(()=>toast('error','Gagal konfirmasi'));
}
window.konfirmasiQRIS=konfirmasiQRIS;

/********************
 * LAPORAN
 ********************/
function tampilRekap(){
  const tbody=document.getElementById('rekapBody'); if(!tbody) return;
  tbody.innerHTML='';
  const byDate={}; dataKas.forEach(t=>{ (byDate[t.tanggal] ||= []).push(t); });
  Object.entries(byDate).forEach(([tgl,list])=>{
    let masuk=0, keluar=0; list.forEach(l=>{ if(l.tipe==='pemasukan') masuk+=l.jumlah; else keluar+=l.jumlah; });
    const saldo=masuk-keluar;
    list.forEach((l,i)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${i===0?tgl:''}</td><td>${l.nama}</td><td>${l.kategori}</td><td>${l.tipe==='pemasukan'?rupiah(l.jumlah):'-'}</td><td>${l.tipe==='pengeluaran'?rupiah(l.jumlah):'-'}</td><td>${i===0?rupiah(saldo):''}</td>`;
      tbody.appendChild(tr);
    });
  });
}

/********************
 * CHARTS
 ********************/
let donut=null, line=null;
function renderDashboard(){
  const pemasukan = dataKas.filter(x=>x.tipe==='pemasukan').reduce((a,b)=>a+b.jumlah,0);
  const pengeluaran = dataKas.filter(x=>x.tipe==='pengeluaran').reduce((a,b)=>a+b.jumlah,0);
  const saldo = pemasukan - pengeluaran;
  document.getElementById('sumIn').textContent = rupiah(pemasukan);
  document.getElementById('sumOut').textContent = rupiah(pengeluaran);
  document.getElementById('sumSaldo').textContent = rupiah(saldo);

  const cv=document.getElementById('miniChart');
  if(cv){
    if(donut) donut.destroy();
    donut = new Chart(cv,{type:'doughnut',data:{labels:['Pemasukan','Pengeluaran'],datasets:[{data:[pemasukan,pengeluaran],backgroundColor:['#4cc9f0','#f72585'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{display:false}}}});
  }
}
function renderTrend(){
  const el=document.getElementById('trendChart'); if(!el) return;
  // urut tanggal dd/mm/yyyy
  const days=[...new Set(dataKas.map(d=>d.tanggal))].sort((a,b)=>a.split('/').reverse().join('-').localeCompare(b.split('/').reverse().join('-')));
  let running=0; const points=days.map(d=>{ const delta=dataKas.filter(x=>x.tanggal===d).reduce((acc,t)=>acc+(t.tipe==='pemasukan'?t.jumlah:-t.jumlah),0); running+=delta; return running; });
  if(line) line.destroy();
  line=new Chart(el,{type:'line',data:{labels:days,datasets:[{label:'Saldo Harian',data:points,tension:.35}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});
}

/********************
 * EXPORT
 ********************/
function exportExcel(){ const ws=XLSX.utils.json_to_sheet(dataKas); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Transaksi"); XLSX.writeFile(wb, "LaporanKas.xlsx"); }
function exportPDF(){ const { jsPDF }=window.jspdf; const doc=new jsPDF(); doc.text("Laporan Kas Kelas",14,16); dataKas.forEach((t,i)=>doc.text(`${i+1}. ${t.tanggal} • ${t.nama} • ${t.tipe} • ${rupiah(t.jumlah)}`,14,26+i*6)); doc.save("LaporanKas.pdf"); }
document.getElementById('btnExportXls')?.addEventListener('click',exportExcel);
document.getElementById('btnExportPdf')?.addEventListener('click',exportPDF);
document.getElementById('btnExportXls2')?.addEventListener('click',exportExcel);
document.getElementById('btnExportPdf2')?.addEventListener('click',exportPDF);

/********************
 * LOG AKTIVITAS
 ********************/
function addLog(aksi,detail){ db.ref('logs').push({ waktu:new Date().toLocaleString('id-ID'), user:user.username, aksi, detail }); }
function renderAktivitas(){
  const list=document.getElementById('aktivitasList'); if(!list) return; list.innerHTML='';
  aktivitas.slice().reverse().forEach(l=>{
    const div=document.createElement('div'); div.className=''; div.innerHTML=`<b>${l.waktu}</b> — ${l.user} <i>${l.aksi}</i> ${l.detail||''}`;
    list.appendChild(div);
  });
}

/********************
 * LISTENERS
 ********************/
function listenTransaksi(){
  db.ref('transaksi').on('value', snap=>{
    const v=snap.val();
    dataKas = v ? Object.entries(v).map(([id,val])=>({id,...val})) : [];
    renderTable(); renderTotalKategori(); renderDashboard(); renderTrend();
  });
}
function listenPending(){
  db.ref('pending_qris').on('value', snap=>{
    const v=snap.val();
    pendingQRIS = v ? Object.entries(v).map(([id,val])=>({id,...val})) : [];
    renderPendingQRIS();
  });
}
function listenLogs(){
  db.ref('logs').on('value', snap=>{
    const v=snap.val();
    aktivitas = v ? Object.entries(v).map(([id,val])=>({id,...val})) : [];
    renderAktivitas();
  });
}

/********************
 * BOOT
 ********************/
(function init(){
  listenTransaksi();
  listenPending();
  listenLogs();
  renderDashboard();
})();
