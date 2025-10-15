/* ========= UTIL ========= */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => new Intl.NumberFormat('id-ID').format(n);
const money = n => `Rp ${fmt(Number(n || 0))}`;
const toast = (icon, text) => Swal.fire({ icon, text, timer: 1400, showConfirmButton: false });
const confirmBox = (title, text) => Swal.fire({ icon: 'warning', title, text, showCancelButton: true, confirmButtonText: 'Ya', cancelButtonText: 'Batal' });

/* ========= AUTH ========= */
const me = JSON.parse(localStorage.getItem('activeUser') || 'null');
if (!me) location.href = 'login.html';
$('#whoami').textContent = me?.nama || me?.username || '-';
$('#logout').onclick = () => { localStorage.removeItem('activeUser'); location.href = 'login.html'; };
const isAdmin = (me?.role === 'admin');
if (!isAdmin) $$('.admin-only').forEach(el => el.remove());

/* ========= GLOBAL STATE ========= */
let IURAN = 5000;
let START_WEEK = null;
let users = {};
let transaksi = {};

/* ========= WAKTU & PERIODE ========= */
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const todayISO = () => new Date().toISOString().slice(0, 10);
function startOfMonth(y, m) { return new Date(y, m, 1, 0, 0, 0, 0); }
function endOfMonth(y, m) { return new Date(y, m + 1, 0, 23, 59, 59, 999); }
function startOfYear(y) { return new Date(y, 0, 1, 0, 0, 0, 0); }
function endOfYear(y) { return new Date(y, 11, 31, 23, 59, 59, 999); }

/* ========= SETTINGS ========= */
function loadSettings() {
  return db.ref('settings').once('value').then(s => {
    const v = s.val() || {};
    IURAN = Number(v.iuran || 5000);
    START_WEEK = v.start_week || null;
    $('#iuranLabel').textContent = money(IURAN);
    $('#setIuran').value = IURAN;
    $('#setStart').value = START_WEEK || '';
  });
}
$('#btnSimpanPengaturan')?.addEventListener('click', () => {
  const i = Number($('#setIuran').value || 0);
  const st = $('#setStart').value || null;
  db.ref('settings').set({ iuran: i, start_week: st }).then(() => toast('success', 'Pengaturan disimpan'));
});
$('#btnReloadPengaturan')?.addEventListener('click', loadSettings);

/* ========= USERS ========= */
function loadUsers() {
  return db.ref('users').once('value').then(s => { users = s.val() || {}; renderAnggota(); });
}
function renderAnggota() {
  const q = ($('#cariAnggota')?.value || '').toLowerCase();
  const tbody = $('#tbodyAnggota'); if (!tbody) return;
  tbody.innerHTML = '';
  const list = Object.values(users)
    .filter(u => u.role !== 'admin')
    .filter(u => !q || u.nama.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  $('#countAnggota')?.textContent = list.length;

  list.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.nama}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>
        ${isAdmin ? `
        <button class="btn small" data-act="reset" data-id="${u.username}">Reset PW</button>
        <button class="btn small" data-act="toggle" data-id="${u.username}">${u.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}</button>
        <button class="btn small danger" data-act="hapus" data-id="${u.username}">Hapus</button>`
        : (me.username === u.username ? `<button class="btn small" data-act="pw" data-id="${u.username}">Ganti Password</button>` : '')}
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.act, id = b.dataset.id;
    if (act === 'pw') {
      Swal.fire({ title: 'Ganti Password', input: 'text', inputPlaceholder: 'Password baru', showCancelButton: true })
        .then(r => { if (r.value) db.ref('users/' + id + '/password').set(r.value).then(() => toast('success', 'Password diperbarui')); });
    }
    if (!isAdmin) return;
    if (act === 'reset') db.ref('users/' + id + '/password').set(users[id].email).then(() => toast('success', 'Password direset'));
    if (act === 'toggle') db.ref('users/' + id + '/aktif').set(users[id].aktif === false).then(() => { toast('success', 'Status diubah'); loadUsers(); });
    if (act === 'hapus') confirmBox('Hapus anggota?', 'Data ini tidak bisa dikembalikan.').then(r => {
      if (r.isConfirmed) db.ref('users/' + id).remove().then(() => { toast('success', 'Anggota dihapus'); loadUsers(); });
    });
  };
}

/* ========= TRANSAKSI ========= */
function transaksiArray() {
  return Object.entries(transaksi).map(([id, t]) => ({ id, ...t })).sort((a, b) => (a.tanggal > b.tanggal ? -1 : 1));
}
function renderTransaksi() {
  let arr = transaksiArray();
  const m = Number($('#selBulan').value), y = Number($('#selTahun').value);
  const start = startOfMonth(y, m), end = endOfMonth(y, m);
  arr = arr.filter(t => { const d = new Date(t.tanggal); return d >= start && d <= end; });

  const q = ($('#search').value || '').toLowerCase();
  if (q) arr = arr.filter(t => (t.nama || '').toLowerCase().includes(q) || (t.username || '').toLowerCase().includes(q) || (t.catatan || '').toLowerCase().includes(q));

  const tbody = $('#tbody'); tbody.innerHTML = '';
  arr.forEach(t => {
    const tr = document.createElement('tr');
    const st = t.jenis === 'qris'
      ? (t.status === 'approved' ? '<span class="badge success">approved</span>'
        : t.status === 'rejected' ? '<span class="badge danger">rejected</span>'
        : '<span class="badge warn">pending</span>') : '-';
    tr.innerHTML = `<td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td>${t.nama}</td><td>${t.jenis}</td><td>${t.metode || '-'}</td>
      <td>${money(t.nominal)}</td><td>${t.catatan || ''}</td><td>${st}</td>`;
    tbody.appendChild(tr);
  });
}

/* ========= QRIS ========= */
$('#btnQRIS')?.addEventListener('click', () => {
  Swal.fire({
    title: '💳 Ajukan Pembayaran QRIS',
    html: `
      <div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;">
        <div><img src="assets/qris.jpg" style="width:200px;border-radius:8px;box-shadow:0 0 6px rgba(0,0,0,0.2)"></div>
        <div style="flex:1;min-width:200px;">
          <label>Nominal</label><input id="q_nom" type="number" class="swal2-input" value="${IURAN}">
          <label>Keterangan</label><input id="q_cat" class="swal2-input" placeholder="contoh: iuran minggu ke-3">
        </div>
      </div>`,
    showCancelButton: true,
    confirmButtonText: 'Ajukan',
    preConfirm: () => ({ nominal: Number($('#q_nom').value || 0), catatan: $('#q_cat').value || '' })
  }).then(r => {
    if (!r.value) return;
    const p = {
      id: db.ref('transaksi').push().key,
      tanggal: todayISO(),
      username: me.username,
      nama: me.nama,
      jenis: 'qris',
      metode: 'QRIS',
      nominal: r.value.nominal,
      catatan: r.value.catatan,
      status: 'pending'
    };
    db.ref('transaksi/' + p.id).set(p).then(() => toast('success', 'Pengajuan dikirim.'));
  });
});

/* ========= REKAP ========= */
function sumByUserInRange(uname, start, end) {
  return transaksiArray().filter(t => t.username === uname && (t.jenis === 'setoran' || (t.jenis === 'qris' && t.status === 'approved')))
    .reduce((s, t) => { const d = new Date(t.tanggal); return (d >= start && d <= end) ? s + Number(t.nominal || 0) : s; }, 0);
}
function renderRekap() {
  const scope = $('#rekapScope').value, tahun = Number($('#rekapTahun').value), bulanIdx = Number($('#rekapBulan').value);
  const q = ($('#cariNamaRekap').value || '').toLowerCase(), filterStatus = $('#filterStatus').value;
  let start, end, target;
  if (scope === 'bulan') { start = startOfMonth(tahun, bulanIdx); end = endOfMonth(tahun, bulanIdx); target = 4 * IURAN; }
  else { start = startOfYear(tahun); end = endOfYear(tahun); target = 48 * IURAN; }

  const tbody = $('#tbodyRekap'); tbody.innerHTML = '';
  Object.values(users).filter(u => u.role !== 'admin' && u.aktif !== false)
    .filter(u => !q || u.nama.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
    .forEach(u => {
      const paid = sumByUserInRange(u.username, start, end), sisa = Math.max(target - paid, 0), lunas = sisa <= 0;
      if (filterStatus === 'lunas' && !lunas) return;
      if (filterStatus === 'belum' && lunas) return;
      const st = lunas ? '<span class="badge success">Sudah Lunas</span>' : '<span class="badge danger">Belum Lunas</span>';
      tbody.innerHTML += `<tr><td>${u.nama}</td><td>${money(paid)}</td><td>${money(sisa)}</td><td>${st}</td></tr>`;
    });
}
$('#btnRefreshRekap')?.addEventListener('click', () => { renderRekap(); toast('success', 'Filter diterapkan'); });

/* ========= SEARCH ========= */
$('#search')?.addEventListener('input', renderTransaksi);
$('#cariAnggota')?.addEventListener('input', renderAnggota);
$('#cariNamaRekap')?.addEventListener('input', renderRekap);

/* ========= RESET ========= */
$('#btnResetAll')?.addEventListener('click', () => {
  if (!isAdmin) return;
  confirmBox('Reset semua transaksi?', 'Tindakan ini tidak bisa dibatalkan.').then(r => {
    if (r.isConfirmed) db.ref('transaksi').remove().then(() => toast('success', 'Semua transaksi direset.'));
  });
});

/* ========= INIT ========= */
Promise.all([loadSettings(), loadUsers()]).then(() => {
  db.ref('transaksi').on('value', s => { transaksi = s.val() || {}; renderTransaksi(); renderRekap(); });
  renderTransaksi(); renderRekap();
});
