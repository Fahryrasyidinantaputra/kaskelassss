const user = JSON.parse(localStorage.getItem('activeUser'));
if(!user) location.href='login.html';

document.querySelectorAll('.sidebar a').forEach(a=>{
  a.onclick = ()=>{
    document.querySelectorAll('.sidebar a').forEach(b=>b.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.card').forEach(c=>c.style.display='none');
    const target = a.id.replace('tab-','');
    document.getElementById(target).style.display='block';
  };
});

function logout(){
  localStorage.removeItem('activeUser');
  location.href='login.html';
}

// Transaksi
function tambahTransaksi(){
  const nama=document.getElementById('nama').value;
  const tipe=document.getElementById('tipe').value;
  const jumlah=parseInt(document.getElementById('jumlah').value);
  const ket=document.getElementById('keterangan').value;
  if(!nama||!jumlah) return alert('Lengkapi semua data!');

  db.ref('transaksi').push({nama,tipe,jumlah,ket,tanggal:new Date().toLocaleDateString()});
  alert('Transaksi disimpan!');
  renderTabel();
}

// Render tabel
function renderTabel(){
  db.ref('transaksi').on('value',snap=>{
    const data=snap.val()||{};
    const tbody=Object.entries(data).map(([id,v])=>`
      <tr>
        <td>${v.tanggal}</td>
        <td>${v.nama}</td>
        <td>${v.tipe}</td>
        <td>Rp ${v.jumlah.toLocaleString()}</td>
        <td>${v.ket}</td>
      </tr>
    `).join('');
    document.getElementById('tabelTransaksi').innerHTML='<tr><th>Tanggal</th><th>Nama</th><th>Tipe</th><th>Jumlah</th><th>Keterangan</th></tr>'+tbody;
    document.getElementById('tabelLaporan').innerHTML=document.getElementById('tabelTransaksi').innerHTML;
    updateChart(data);
  });
}

function updateChart(data){
  let pemasukan=0, pengeluaran=0;
  Object.values(data).forEach(v=>{
    if(v.tipe==='Pemasukan') pemasukan+=v.jumlah;
    else pengeluaran+=v.jumlah;
  });
  const ctx=document.getElementById('chartRasio').getContext('2d');
  new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:['Pemasukan','Pengeluaran'],
      datasets:[{data:[pemasukan,pengeluaran], backgroundColor:['#0d6efd','#ff6384']}]
    }
  });
  document.getElementById('saldo-info').innerText='Saldo Saat Ini: Rp '+(pemasukan-pengeluaran).toLocaleString();
}

function exportExcel(){
  alert('Export Excel masih tahap pengembangan!');
}

renderTabel();
