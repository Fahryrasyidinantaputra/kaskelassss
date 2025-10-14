/********************
 * IMPORT FIREBASE
 ********************/
import { db, ref, push, set, onValue, update, remove } from './firebase.js';

/********************
 * STATE & LOCAL LOGIN
 ********************/
const LS_USERS_KEY  = 'kk_users';
const LS_ACTIVE_KEY = 'kk_active_user';

let users = JSON.parse(localStorage.getItem(LS_USERS_KEY)) || [
  { username:'admin', password:'12345', role:'admin' }
];
let activeUser = JSON.parse(localStorage.getItem(LS_ACTIVE_KEY)) || null;

// Koleksi data realtime dari Firebase
let dataKas = [];
let pendingQRIS = [];

const saveUsers  = ()=>localStorage.setItem(LS_USERS_KEY,  JSON.stringify(users));
const saveActive = ()=>localStorage.setItem(LS_ACTIVE_KEY, JSON.stringify(activeUser));

/********************
 * AUTH (Overlay Tabs)
 ********************/
const overlay = document.getElementById('authOverlay');
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(t=>{
  t.onclick=()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab).classList.add('active');
  };
});

function register() {
  const name = document.getElementById('regUser').value.trim();
  const pass = document.getElementById('regPass').value.trim();
  if (!name || !pass) return alert('Lengkapi nama & sandi.');
  if (users.some(u => u.username.toLowerCase() === name.toLowerCase())) {
    return alert('Nama pengguna sudah ada.');
  }
  // Simpan user ke Firebase (opsional) + local list agar bisa login
  const userRef = ref(db, 'users/' + name);
  set(userRef, { username: name, password: pass, role: 'member' });
  users.push({ username: name, password: pass, role: 'member' });
  saveUsers();
  alert('Pendaftaran berhasil. Silakan login.');
  tabs[0].click();
}

function login() {
  const u=document.getElementById('loginUser').value.trim();
  const p=document.getElementById('loginPass').value.trim();
  const found=users.find(x=>x.username===u && x.password===p);
  if(!found) return alert('Nama pengguna / sandi salah.');
  activeUser={username:found.username,role:found.role};
  saveActive();
  initUIAfterLogin();
}

function logout(){
  activeUser=null;
  saveActive();
  overlay.style.display='flex';
}

/********************
 * UTIL
 ********************/
const rupiah = n=>'Rp '+(n||0).toLocaleString('id-ID');
const todayStr=()=>new Date().toLocaleDateString('id-ID');

/********************
 * ROLE & UI
 ********************/
function applyRoleUI(){
  const role=activeUser?.role||'guest';
  document.getElementById('userBadge').textContent=activeUser?`${activeUser.username} (${role})`:'—';
  document.getElementById('permNote').textContent=
    (role==='admin')
      ?'Anda login sebagai ADMIN: dapat menambah, mengubah, menghapus transaksi dan konfirmasi QRIS.'
      :'Anda login sebagai ANGGOTA: hanya dapat melihat data dan membuat permintaan pembayaran via QRIS.';
  const formTrans=document.getElementById('formTransaksi');
  const aksiHead=document.getElementById('aksiHead');
  if(role==='member'){
    formTrans.style.display='none';
    aksiHead.style.display='none';
    document.querySelectorAll('.action').forEach(el=>el.style.display='none');
  }else{
    formTrans.style.display='grid';
    aksiHead.style.display='';
  }
}

/********************
 * NAVIGATION
 ********************/
document.querySelectorAll('.navlink').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.navlink').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target=btn.dataset.section;
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById(target).classList.add('active');

    if(target==='dashboard') renderDashboard();
    if(target==='transaksi') renderTable();
    if(target==='qris') renderPendingQRIS();
    if(target==='laporan') tampilRekap();
  };
});

/********************
 * TRANSAKSI (Firebase)
 ********************/
function tambahTransaksi() {
  const nama = document.getElementById('nama').value.trim();
  const tipe = document.getElementById('tipe').value;
  const kategori = document.getElementById('kategori').value || 'Kas Rutin';
  const ket = document.getElementById('keterangan').value.trim();
  const jumlah = parseInt(document.getElementById('jumlah').value, 10);
  if (!nama || !jumlah) return alert('Nama & jumlah harus diisi.');

  const transaksiRef = ref(db, 'transaksi/');
  push(transaksiRef, { tanggal: todayStr(), nama, tipe, kategori, ket, jumlah, source: 'Manual' });

  clearTransForm();
  alert('Transaksi berhasil disimpan ke Firebase!');
}

function clearTransForm(){
  ['nama','keterangan','jumlah'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('tipe').value='pemasukan';
  document.getElementById('kategori').value='Kas Rutin';
}

function renderTable(){
  const body=document.getElementById('tabelKasBody');
  if(!body)return;
  body.innerHTML='';
  dataKas.slice().reverse().forEach(item=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${item.tanggal}</td>
      <td>${item.nama}</td>
      <td>${item.tipe}</td>
      <td>${item.kategori}</td>
      <td>${item.ket||'-'}</td>
      <td>${rupiah(item.jumlah)}</td>
      ${/* kolom aksi dipertahankan struktur th-nya (id="aksiHead") tetapi tanpa tombol kalau member */''}
    `;
    body.appendChild(tr);
  });
}

/********************
 * QRIS (PENDING → KONFIRMASI ADMIN)
 ********************/
function ajukanQRIS(){
  const nama=document.getElementById('qrisNama').value.trim();
  const nominal=parseInt(document.getElementById('qrisNominal').value,10);
  const ket=document.getElementById('qrisKeterangan').value.trim();
  if(!nama||!nominal)return alert('Nama dan nominal wajib diisi.');

  const qrisRef = ref(db, 'qris/');
  push(qrisRef, { nama, nominal, ket, tanggal: todayStr(), status:'PENDING', metode:'DANA' });

  alert('Permintaan QRIS dikirim, menunggu konfirmasi admin.');
  document.getElementById('qrisNama').value='';
  document.getElementById('qrisNominal').value='';
  document.getElementById('qrisKeterangan').value='';
}

function renderPendingQRIS(){
  const tbody=document.getElementById('pendingBody');
  if(!tbody)return;
  tbody.innerHTML='';
  pendingQRIS.slice().reverse().forEach(item=>{
    const action = (activeUser?.role==='admin' && item.status==='PENDING')
      ? `<button class="success" onclick="konfirmasiQRIS('${item.id}')">Konfirmasi</button>` : '-';
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${item.nama}</td>
      <td>${rupiah(item.nominal)}</td>
      <td>${item.ket||'-'}</td>
      <td>${item.status}</td>
      <td>${action}</td>`;
    tbody.appendChild(tr);
  });
}

function konfirmasiQRIS(id){
  const target = pendingQRIS.find(x=>x.id===id);
  if(!target)return;
  if(activeUser?.role!=='admin')return alert('Hanya admin yang bisa konfirmasi.');

  // Update status
  const qref = ref(db, 'qris/'+id);
  update(qref, { status:'LUNAS' });

  // Catat jadi pemasukan otomatis
  const tRef = ref(db, 'transaksi/');
  push(tRef, {
    tanggal: todayStr(),
    nama: target.nama,
    tipe: 'pemasukan',
    kategori: 'QRIS',
    ket: target.ket || 'Pembayaran via DANA',
    jumlah: target.nominal,
    source: 'DANA'
  });

  alert('QRIS dikonfirmasi & tercatat sebagai pemasukan.');
}

/********************
 * LAPORAN / REKAP
 ********************/
function tampilRekap(){
  const mode=document.getElementById('modeRekap').value;
  const agg={};
  for(const it of dataKas){
    let key=it.tanggal; // default per hari
    if(mode==='bulan'){
      const [d,m,y]=it.tanggal.split('/');
      key=`${m}/${y}`;
    }else if(mode==='tahun'){
      const [d,m,y]=it.tanggal.split('/');
      key=y;
    }else if(mode==='minggu'){
      // minggu sederhana: YYYY-Wxx bisa ditambah kalau perlu
      const [d,m,y]=it.tanggal.split('/');
      key=`W?/${y}`;
    }
    if(!agg[key])agg[key]=[];
    agg[key].push(it);
  }
  const tbody=document.getElementById('rekapBody');
  tbody.innerHTML='';
  Object.entries(agg).forEach(([period,transaksi])=>{
    let totalIn=0,totalOut=0;
    transaksi.forEach(t=>{
      if(t.tipe==='pemasukan')totalIn+=t.jumlah; else totalOut+=t.jumlah;
    });
    const saldo=totalIn-totalOut;
    transaksi.forEach((t,idx)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${idx===0?period:''}</td>
        <td>${t.nama}</td>
        <td>${t.source||'-'}</td>
        <td>${t.tipe==='pemasukan'?rupiah(t.jumlah):'-'}</td>
        <td>${t.tipe==='pengeluaran'?rupiah(t.jumlah):'-'}</td>
        <td>${idx===0?rupiah(saldo):''}</td>`;
      tbody.appendChild(tr);
    });
  });
}

function exportExcel(){
  const html=document.getElementById('rekapTable').outerHTML;
  const blob=new Blob([html],{type:'application/vnd.ms-excel'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='rekap_kas.xls';
  a.click();
}

/********************
 * DASHBOARD & CHART
 ********************/
let miniChartInstance=null;
function renderDashboard(){
  const inSum = dataKas.filter(i=>i.tipe==='pemasukan').reduce((a,b)=>a+b.jumlah,0);
  const outSum= dataKas.filter(i=>i.tipe==='pengeluaran').reduce((a,b)=>a+b.jumlah,0);
  const saldo = inSum-outSum;

  document.getElementById('sumIn').textContent   = rupiah(inSum);
  document.getElementById('sumOut').textContent  = rupiah(outSum);
  document.getElementById('sumSaldo').textContent= rupiah(saldo);
  const headerSaldo=document.getElementById('saldoHeader'); if(headerSaldo) headerSaldo.textContent=rupiah(saldo);

  // hitung transaksi bulan ini (sederhana, berdasarkan bulan saat ini)
  const now=new Date(); const m=now.getMonth()+1; const y=now.getFullYear();
  const countMonth=dataKas.filter(x=>{
    const [d,mm,yy]=x.tanggal.split('/').map(Number);
    return mm===m && yy===y;
  }).length;
  const cEl=document.getElementById('countThisMonth'); if(cEl) cEl.textContent=countMonth.toString();

  const ctx=document.getElementById('miniChart'); if(!ctx) return;
  if(miniChartInstance) miniChartInstance.destroy();
  miniChartInstance=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Pemasukan','Pengeluaran'],
      datasets:[{data:[inSum,outSum],backgroundColor:['#4cc9f0','#f72585'],borderWidth:1}]
    },
    options:{plugins:{legend:{display:false}},cutout:'70%',responsive:true,maintainAspectRatio:false}
  });
}

/********************
 * FIREBASE REALTIME SYNC
 ********************/
function loadDataFirebase() {
  const transaksiRef = ref(db, 'transaksi/');
  onValue(transaksiRef, (snapshot) => {
    const data = snapshot.val();
    dataKas = [];
    if (data) {
      dataKas = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    }
    renderTable();
    renderDashboard();
  });

  const qrisRef = ref(db, 'qris/');
  onValue(qrisRef, (snapshot)=>{
    const data = snapshot.val();
    pendingQRIS = [];
    if(data){
      pendingQRIS = Object.entries(data).map(([id,val])=>({id,...val}));
    }
    renderPendingQRIS();
  });
}

/********************
 * INIT
 ********************/
function initUIAfterLogin(){
  overlay.style.display='none';
  applyRoleUI();
  loadDataFirebase(); // realtime sync
}

// Ekspor fungsi ke window agar bisa dipanggil dari HTML (onclick)
window.register = register;
window.login = login;
window.logout = logout;
window.tambahTransaksi = tambahTransaksi;
window.ajukanQRIS = ajukanQRIS;
window.konfirmasiQRIS = konfirmasiQRIS;
window.tampilRekap = tampilRekap;
window.exportExcel = exportExcel;

(function boot(){
  if(!activeUser){ overlay.style.display='flex'; }
  else{
    document.addEventListener('DOMContentLoaded',()=>{ initUIAfterLogin(); });
  }
})();
