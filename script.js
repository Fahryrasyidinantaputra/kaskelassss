/********************
 * IMPORT FIREBASE
 ********************/
import { db, ref, set, push, onValue, update, remove } from './firebase.js';

/********************
 * STORAGE & STATE
 ********************/
const LS_ACTIVE_KEY = 'kk_active_user';
let activeUser = JSON.parse(localStorage.getItem(LS_ACTIVE_KEY)) || null;

let dataKas = [];        // semua transaksi
let pendingQRIS = [];    // semua pending QRIS

const rupiah  = n => 'Rp ' + (n || 0).toLocaleString('id-ID');
const todayStr = () => new Date().toLocaleDateString('id-ID');

/********************
 * AUTH & ROLE
 ********************/
function logout() {
  localStorage.removeItem(LS_ACTIVE_KEY);
  location.replace('login.html');
}
window.logout = logout;

function applyRoleUI() {
  const role = activeUser?.role || 'guest';
  const badge = document.getElementById('userBadge');
  if (badge) badge.textContent = activeUser ? `${activeUser.username} (${role})` : '—';

  const note = document.getElementById('permNote');
  if (note) {
    note.textContent = (role === 'admin')
      ? 'Anda login sebagai ADMIN: dapat menambah, menghapus transaksi dan konfirmasi QRIS.'
      : 'Anda login sebagai ANGGOTA: hanya dapat melihat data dan mengajukan QRIS.';
  }

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

/********************
 * NAVIGASI
 ********************/
document.querySelectorAll('.navlink')?.forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll('.navlink').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.section;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    if(target==='dashboard') renderDashboard();
    if(target==='transaksi') renderTable();
    if(target==='qris') renderPendingQRIS();
    if(target==='laporan') tampilRekap();
  };
});

/********************
 * TAMBAH TRANSAKSI
 ********************/
function clearTransForm() {
  ['nama','keterangan','jumlah'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value='';
  });
  const t=document.getElementById('tipe'); if(t) t.value='pemasukan';
  const k=document.getElementById('kategori'); if(k) k.value='Kas Rutin';
}

function tambahTransaksi() {
  if (activeUser?.role !== 'admin') {
    alert('Hanya ADMIN yang boleh menambah transaksi.');
    return;
  }
  const nama = document.getElementById('nama').value.trim();
  const tipe = document.getElementById('tipe').value;
  const kategori = document.getElementById('kategori').value || 'Kas Rutin';
  const ket = document.getElementById('keterangan').value.trim();
  const jumlah = parseInt(document.getElementById('jumlah').value, 10);

  if (!nama || !jumlah) return alert('Nama & jumlah harus diisi.');

  const transaksiRef = ref(db, 'transaksi/');
  push(transaksiRef, {
    tanggal: todayStr(),
    nama, tipe, kategori, ket, jumlah, source:'Manual'
  });
  clearTransForm();
  alert('Transaksi berhasil disimpan.');
}
window.tambahTransaksi = tambahTransaksi;

/********************
 * HAPUS TRANSAKSI (ADMIN SAJA)
 ********************/
function hapusTransaksi(id) {
  if (activeUser?.role !== 'admin') return alert('Hanya ADMIN yang boleh menghapus.');
  if (!confirm('Yakin ingin menghapus transaksi ini?')) return;

  const tRef = ref(db, 'transaksi/' + id);
  remove(tRef)
    .then(()=>alert('Transaksi berhasil dihapus.'))
    .catch(e=>{
      console.error(e);
      alert('Gagal menghapus transaksi.');
    });
}
window.hapusTransaksi = hapusTransaksi;

/********************
 * RENDER TABEL TRANSAKSI
 ********************/
function renderTable(){
  const body=document.getElementById('tabelKasBody');
  if(!body) return;
  body.innerHTML='';
  dataKas.slice().reverse().forEach(item=>{
    const tr=document.createElement('tr');
    const aksi = (activeUser?.role === 'admin')
      ? `<button class="btn-delete" onclick="hapusTransaksi('${item.id}')">Hapus</button>`
      : '-';
    tr.innerHTML = `
      <td>${item.tanggal}</td>
      <td>${item.nama}</td>
      <td>${item.tipe}</td>
      <td>${item.kategori}</td>
      <td>${item.ket || '-'}</td>
      <td>${rupiah(item.jumlah)}</td>
      <td>${aksi}</td>
    `;
    body.appendChild(tr);
  });
}

/********************
 * QRIS
 ********************/
function ajukanQRIS(){
  const nama=document.getElementById('qrisNama').value.trim();
  const nominal=parseInt(document.getElementById('qrisNominal').value,10);
  const ket=document.getElementById('qrisKeterangan').value.trim();
  if(!nama||!nominal) return alert('Nama & nominal wajib diisi.');

  const qRef=ref(db,'pending_qris/');
  push(qRef,{ nama, nominal, ket, tanggal:todayStr(), status:'PENDING', metode:'QRIS' });
  alert('Permintaan QRIS dikirim, menunggu konfirmasi admin.');
  document.getElementById('qrisNama').value='';
  document.getElementById('qrisNominal').value='';
  document.getElementById('qrisKeterangan').value='';
}
window.ajukanQRIS = ajukanQRIS;

function renderPendingQRIS(){
  const tbody=document.getElementById('pendingBody');
  if(!tbody) return;
  tbody.innerHTML='';
  pendingQRIS.slice().reverse().forEach(item=>{
    const isAdmin = activeUser?.role==='admin';
    const action = (isAdmin && item.status==='PENDING')
      ? `<button class="success" onclick="konfirmasiQRIS('${item.id}')">Konfirmasi</button>`
      : '-';
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${rupiah(item.nominal)}</td>
      <td>${item.ket || '-'}</td>
      <td>${item.status}</td>
      <td>${action}</td>
    `;
    tbody.appendChild(tr);
  });
}

function konfirmasiQRIS(id){
  if (activeUser?.role !== 'admin') return alert('Hanya ADMIN.');
  const target = pendingQRIS.find(x=>x.id===id);
  if(!target) return alert('Data tidak ditemukan.');

  // Tambah ke transaksi
  const tRef=ref(db,'transaksi/');
  push(tRef,{
    tanggal:todayStr(),
    nama:target.nama,
    tipe:'pemasukan',
    kategori:'QRIS',
    ket:target.ket||'Pembayaran via QRIS',
    jumlah:target.nominal,
    source:'QRIS'
  });

  // Hapus pending
  remove(ref(db,'pending_qris/'+id))
    .then(()=>alert('QRIS dikonfirmasi & dipindahkan ke transaksi.'))
    .catch(e=>console.error(e));
}
window.konfirmasiQRIS = konfirmasiQRIS;

/********************
 * LAPORAN
 ********************/
function tampilRekap(){
  const tbody=document.getElementById('rekapBody');
  if(!tbody) return;
  tbody.innerHTML='';
  const byDate={};
  dataKas.forEach(t=>{(byDate[t.tanggal] ||= []).push(t);});
  Object.entries(byDate).forEach(([tgl,list])=>{
    let inSum=0,outSum=0;
    list.forEach(l=>{if(l.tipe==='pemasukan') inSum+=l.jumlah; else outSum+=l.jumlah;});
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
window.tampilRekap = tampilRekap;

/********************
 * DASHBOARD (RASIO CHART)
 ********************/
let miniChartInstance=null;
function renderDashboard(){
  const inSum  = dataKas.filter(i=>i.tipe==='pemasukan').reduce((a,b)=>a+b.jumlah,0);
  const outSum = dataKas.filter(i=>i.tipe==='pengeluaran').reduce((a,b)=>a+b.jumlah,0);
  const saldo  = inSum - outSum;

  const elIn=document.getElementById('sumIn');  if(elIn) elIn.textContent=rupiah(inSum);
  const elOut=document.getElementById('sumOut');if(elOut)elOut.textContent=rupiah(outSum);
  const elSd=document.getElementById('sumSaldo');if(elSd)elSd.textContent=rupiah(saldo);
  const headerSaldo=document.getElementById('saldoHeader');if(headerSaldo)headerSaldo.textContent=rupiah(saldo);

  // rasio chart fix ukuran
  const wrap=document.querySelector('.chart-wrap');
  const cv=document.getElementById('miniChart');
  if(wrap) wrap.style.height='280px';
  if(!cv) return;

  if(miniChartInstance) miniChartInstance.destroy();
  miniChartInstance=new Chart(cv,{
    type:'doughnut',
    data:{
      labels:['Pemasukan','Pengeluaran'],
      datasets:[{
        data:[inSum,outSum],
        backgroundColor:['#4cc9f0','#f72585'],
        borderWidth:0
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'65%',
      plugins:{legend:{display:false}},
      layout:{padding:10}
    }
  });
}

/********************
 * REALTIME LISTENERS
 ********************/
function listenTransaksi(){
  onValue(ref(db,'transaksi/'),snap=>{
    const data=snap.val();
    dataKas=data?Object.entries(data).map(([id,val])=>({id,...val})):[];
    renderTable();
    renderDashboard();
  });
}
function listenPending(){
  onValue(ref(db,'pending_qris/'),snap=>{
    const data=snap.val();
    pendingQRIS=data?Object.entries(data).map(([id,val])=>({id,...val})):[];
    renderPendingQRIS();
  });
}

/********************
 * INIT
 ********************/
(function init(){
  applyRoleUI();
  listenTransaksi();
  listenPending();
  renderDashboard();
})();
