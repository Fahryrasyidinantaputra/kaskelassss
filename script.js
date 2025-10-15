/* ========= Util ========= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmt = (n) => new Intl.NumberFormat('id-ID').format(n);
const money = (n) => `Rp ${fmt(Number(n || 0))}`;
const toast = (icon, text) => Swal.fire({ icon, text, timer: 1400, showConfirmButton: false });
const confirmBox = (title, text) =>
  Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Ya',
    cancelButtonText: 'Batal',
  });

/* ========= Auth ========= */
const me = JSON.parse(localStorage.getItem('activeUser') || 'null');
if (!me) {
  location.href = 'login.html';
}
$('#whoami').textContent = me?.nama || me?.username || '-';
$('#logout').onclick = () => {
  localStorage.removeItem('activeUser');
  location.href = 'login.html';
};
const isAdmin = me?.role === 'admin';
if (!isAdmin) {
  $('#adminActions')?.remove();
  $$('.admin-only').forEach((el) => el.remove());
}

/* ========= Dates & Period ========= */
const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];
const todayISO = () => new Date().toISOString().slice(0, 10);
function startOfMonthIdx(y, m) {
  const d = new Date(y, m, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfMonthIdx(y, m) {
  const d = new Date(y, m + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}
function startOfYear(d) {
  const y = d instanceof Date ? d.getFullYear() : d;
  return new Date(y, 0, 1, 0, 0, 0, 0);
}
function endOfYear(d) {
  const y = d instanceof Date ? d.getFullYear() : d;
  return new Date(y, 11, 31, 23, 59, 59, 999);
}

/* ========= State ========= */
let IURAN = DEFAULT_IURAN;
let START_WEEK = null;
let users = {};
let transaksi = {};

function setPeriodeInfo() {
  const y = Number($('#selTahun').value || new Date().getFullYear());
  const m = Number($('#selBulan').value || new Date().getMonth());
  $('#periodeInfo').textContent = `${BULAN[m]} ${y}`;
}

/* ========= Settings ========= */
function loadSettings() {
  return db.ref('settings').once('value').then((s) => {
    const v = s.val() || {};
    IURAN = Number(v.iuran || DEFAULT_IURAN);
    START_WEEK = v.start_week || null;
    $('#iuranLabel').textContent = money(IURAN);
    $('#setIuran').value = IURAN;
    $('#setStart').value = START_WEEK || '';
  });
}
$('#btnSimpanPengaturan')?.addEventListener('click', () => {
  const i = Number($('#setIuran').value || 0);
  const st = $('#setStart').value || null;
  db.ref('settings')
    .set({ iuran: i, start_week: st })
    .then(() => {
      toast('success', 'Pengaturan disimpan');
      loadSettings();
    });
});
$('#btnReloadPengaturan')?.addEventListener('click', () => loadSettings());

/* ========= Users ========= */
function loadUsers() {
  return db
    .ref('users')
    .once('value')
    .then((s) => {
      users = s.val() || {};
      renderAnggota();
    });
}

function renderAnggota() {
  const q = ($('#cariAnggota')?.value || '').toLowerCase();
  const tbody = $('#tbodyAnggota');
  tbody.innerHTML = '';

  const list = Object.values(users)
    .filter((u) => u.role !== 'admin')
    .filter((u) => !q || u.nama.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  $('#countAnggota').textContent = list.length;

  list.forEach((u) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="NIM">${u.username || ''}</td>
      <td data-label="Nama">${u.nama || ''}</td>
      <td data-label="Email">${u.email || ''}</td>
      <td data-label="Role">${u.role || ''}</td>
      <td data-label="Aksi">
        ${
          isAdmin
            ? `
          <button class="btn small" data-act="reset" data-id="${u.username}">Reset PW</button>
          <button class="btn small" data-act="toggle" data-id="${u.username}">${
                u.aktif === false ? 'Aktifkan' : 'Nonaktifkan'
              }</button>
          <button class="btn small danger" data-act="hapus" data-id="${u.username}">Hapus</button>`
            : me.username === u.username
            ? `<button class="btn small" data-act="pw" data-id="${u.username}">Ganti Password</button>`
            : ''
        }
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    const id = b.dataset.id;

    if (act === 'pw') {
      Swal.fire({
        title: 'Ganti Password',
        input: 'text',
        inputPlaceholder: 'Masukkan password baru',
        showCancelButton: true,
      }).then((r) => {
        if (r.value) {
          db.ref('users/' + id + '/password')
            .set(r.value)
            .then(() => toast('success', 'Password diperbarui'));
        }
      });
    }

    if (!isAdmin) return;

    if (act === 'reset') {
      const email = users[id]?.email || '';
      if (!email) return toast('error', 'Email kosong');
      db.ref('users/' + id + '/password')
        .set(email)
        .then(() => toast('success', 'Password direset ke email'));
    } else if (act === 'toggle') {
      const newAktif = users[id].aktif === false ? true : false;
      db.ref('users/' + id + '/aktif')
        .set(newAktif)
        .then(() => {
          toast('success', 'Status diubah');
          loadUsers();
        });
    } else if (act === 'hapus') {
      Swal.fire({
        icon: 'warning',
        title: 'Hapus Anggota?',
        text: 'Data anggota akan dihapus permanen.',
        showCancelButton: true,
        confirmButtonText: 'Ya, hapus',
      }).then((r) => {
        if (r.isConfirmed) {
          db.ref('users/' + id)
            .remove()
            .then(() => {
              toast('success', 'Anggota dihapus');
              loadUsers();
            });
        }
      });
    }
  };
}

/* ========= Nav ========= */
$$('.menu a').forEach((a) => {
  a.onclick = () => {
    $$('.menu a').forEach((x) => x.classList.remove('active'));
    a.classList.add('active');
    $$('.page').forEach((x) => x.classList.remove('active'));
    $('#page-' + a.dataset.page).classList.add('active');
  };
});

/* ========= Select Bulan/Tahun ========= */
function populateMonthYearSelects() {
  const yNow = new Date().getFullYear(),
    mNow = new Date().getMonth();
  const bulanOpt = BULAN.map(
    (b, i) => `<option value="${i}" ${i === mNow ? 'selected' : ''}>${b}</option>`
  ).join('');
  const tahunOpt = Array.from({ length: 6 }, (_, k) => 2025 + k)
    .map((y) => `<option value="${y}" ${y === yNow ? 'selected' : ''}>${y}</option>`)
    .join('');

  if ($('#selBulan')) $('#selBulan').innerHTML = bulanOpt;
  if ($('#selTahun')) $('#selTahun').innerHTML = tahunOpt;
  if ($('#rekapBulan')) $('#rekapBulan').innerHTML = bulanOpt;
  if ($('#rekapTahun')) $('#rekapTahun').innerHTML = tahunOpt;

  $('#rekapScope')?.addEventListener('change', () => {
    const scope = $('#rekapScope').value;
    $('#rekapBulan').style.display = scope === 'bulan' ? '' : 'none';
    renderRekap();
  });

  $('#selBulan')?.addEventListener('change', () => {
    setPeriodeInfo();
    renderTransaksi();
  });
  $('#selTahun')?.addEventListener('change', () => {
    setPeriodeInfo();
    renderTransaksi();
  });
  $('#rekapBulan')?.addEventListener('change', renderRekap);
  $('#rekapTahun')?.addEventListener('change', renderRekap);
  setPeriodeInfo();
}

/* ========= Transaksi ========= */
function transaksiArray() {
  return Object.entries(transaksi)
    .map(([id, t]) => ({ id, ...t }))
    .sort((a, b) => (a.tanggal > b.tanggal ? -1 : 1));
}

function renderTransaksi() {
  let arr = transaksiArray();
  const m = Number($('#selBulan')?.value ?? new Date().getMonth());
  const y = Number($('#selTahun')?.value ?? new Date().getFullYear());
  const start = startOfMonthIdx(y, m),
    end = endOfMonthIdx(y, m);

  arr = arr.filter((t) => {
    const d = new Date(t.tanggal);
    return d >= start && d <= end;
  });

  const q = ($('#search').value || '').toLowerCase();
  if (q) {
    arr = arr.filter(
      (t) =>
        (t.nama || '').toLowerCase().includes(q) ||
        (t.username || '').toLowerCase().includes(q) ||
        (t.catatan || '').toLowerCase().includes(q)
    );
  }

  const tbody = $('#tbody');
  tbody.innerHTML = '';
  let has = false;
  arr.forEach((t) => {
    has = true;
    const statusBadge =
      t.jenis === 'qris'
        ? t.status === 'approved'
          ? '<span class="badge success">approved</span>'
          : t.status === 'rejected'
          ? '<span class="badge danger">rejected</span>'
          : '<span class="badge warn">pending</span>'
        : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
      <td>${t.nama || ''}</td>
      <td><span class="badge ${t.jenis === 'pengeluaran' ? 'danger' : ''}">${t.jenis}</span></td>
      <td>${t.metode || '-'}</td>
      <td class="right">${money(t.nominal)}</td>
      <td>${t.catatan || ''}</td>
      <td>${statusBadge}</td>
      <td>
        ${isAdmin && t.status !== 'pending' ? `<button class="btn small" data-edit="${t.id}">Edit</button>` : ''}
        ${isAdmin ? `<button class="btn small danger" data-del="${t.id}">Hapus</button>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });
  $('#empty').style.display = has ? 'none' : 'block';

  let s = 0;
  transaksiArray().forEach((t) => {
    const masuk = t.jenis === 'setoran' || (t.jenis === 'qris' && t.status === 'approved');
    const keluar = t.jenis === 'pengeluaran';
    if (masuk) s += Number(t.nominal || 0);
    if (keluar) s -= Number(t.nominal || 0);
  });
  $('#saldo').textContent = money(s);

  tbody.onclick = (e) => {
    const ed = e.target.closest('button[data-edit]');
    const del = e.target.closest('button[data-del]');
    if (ed) openEditor(ed.dataset.edit);
    if (del) deleteTransaksi(del.dataset.del);
  };
}
$('#search').oninput = renderTransaksi;

/* ========= QRIS: Ajukan (anggota) ========= */
$('#btnQRIS')?.addEventListener('click', () => {
  Swal.fire({
    title: '💳 Ajukan Pembayaran QRIS',
    html: `
      <div style="display:flex;gap:20px;align-items:flex-start;justify-content:center;">
        <div style="flex:1;text-align:center;">
          <img src="assets/qris.jpg" alt="QRIS" style="width:95%;border-radius:12px;box-shadow:0 0 10px rgba(0,0,0,0.15);margin-bottom:8px;" />
          <div style="font-size:13px;color:#555;">Scan QR ini untuk membayar iuran.<br/>Isi nominal sesuai transfer Anda.</div>
        </div>
        <div style="flex:1;">
          <label>Nama</label>
          <input id="q_nama" class="swal2-input" value="${me.nama || me.username}" disabled>
          <label>Nominal (Rp)</label>
          <input id="q_nom" class="swal2-input" type="number" min="1000" value="${IURAN}">
          <label>Keterangan</label>
          <input id="q_cat" class="swal2-input" placeholder="contoh: iuran minggu ke-3">
        </div>
      </div>
    `,
    width: 850,
    showCancelButton: true,
    confirmButtonText: 'Ajukan Pembayaran',
    preConfirm: () => {
      const nominal = Number($('#q_nom').value || 0);
      const catatan = ($('#q_cat').value || '').trim();
      if (nominal <= 0) {
        Swal.showValidationMessage('Nominal harus lebih dari 0');
        return false;
      }
      return { nominal, catatan };
    },
  }).then((r) => {
    if (!r.value) return;
    const payload = {
      id: db.ref('transaksi').push().key,
      tanggal: todayISO(),
      username: me.username,
      nama: me.nama || me.username,
      jenis: 'qris',
      metode: 'QRIS',
      nominal: r.value.nominal,
      catatan: r.value.catatan,
      status: 'pending',
    };
    db.ref('transaksi/' + payload.id)
      .set(payload)
      .then(() => toast('success', 'Pengajuan dikirim. Menunggu konfirmasi admin.'));
  });
});

/* ========= Tambah Setoran (Pemasukan) ========= */
$('#btnAddCash')?.addEventListener('click', () => {
  Swal.fire({
    title: 'Tambah Setoran (Pemasukan)',
    html: `
      <label>Nama</label>
      <input id="in_nama" class="swal2-input" value="${me.nama || me.username}">
      <label>Nominal (Rp)</label>
      <input id="in_nom" class="swal2-input" type="number" min="1000" placeholder="Masukkan nominal">
      <label>Keterangan</label>
      <input id="in_cat" class="swal2-input" placeholder="contoh: iuran minggu ke-2">
    `,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    preConfirm: () => {
      const nama = $('#in_nama').value.trim();
      const nominal = Number($('#in_nom').value || 0);
      const catatan = $('#in_cat').value.trim();
      if (!nama || nominal <= 0) {
        Swal.showValidationMessage('Nama dan nominal wajib diisi');
        return false;
      }
      return { nama, nominal, catatan };
    },
  }).then((r) => {
    if (!r.value) return;
    const payload = {
      id: db.ref('transaksi').push().key,
      tanggal: todayISO(),
      username: me.username,
      nama: r.value.nama,
      jenis: 'setoran',
      metode: 'Tunai',
      nominal: r.value.nominal,
      catatan: r.value.catatan,
      status: 'approved',
    };
    db.ref('transaksi/' + payload.id)
      .set(payload)
      .then(() => toast('success', 'Setoran berhasil ditambahkan'));
  });
});

/* ========= Tambah Pengeluaran ========= */
$('#btnPengeluaran')?.addEventListener('click', () => {
  Swal.fire({
    title: 'Tambah Pengeluaran',
    html: `
      <label>Nama Pengeluaran</label>
      <input id="out_nama" class="swal2-input" placeholder="Misal: Beli alat tulis">
      <label>Nominal (Rp)</label>
      <input id="out_nom" class="swal2-input" type="number" min="1000" placeholder="Masukkan nominal">
      <label>Keterangan</label>
      <input id="out_cat" class="swal2-input" placeholder="contoh: Keperluan kelas">
    `,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    preConfirm: () => {
      const nama = $('#out_nOke 
