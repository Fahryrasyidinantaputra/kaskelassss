/* ========= Util ========= */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmt = (n) => new Intl.NumberFormat("id-ID").format(n);
const money = (n) => `Rp ${fmt(Number(n || 0))}`;
const toast = (icon, text) =>
  Swal.fire({ icon, text, timer: 1400, showConfirmButton: false });
const confirmBox = (title, text) =>
  Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Ya",
    cancelButtonText: "Batal",
  });

/* ========= Auth ========= */
const me = JSON.parse(localStorage.getItem("activeUser") || "null");
if (!me) {
  location.href = "login.html";
}
$("#whoami").textContent = me?.nama || me?.username || "-";
$("#logout").onclick = () => {
  localStorage.removeItem("activeUser");
  location.href = "login.html";
};
const isAdmin = me?.role === "admin";
if (!isAdmin) {
  $("#adminActions")?.remove();
  $$(".admin-only").forEach((el) => el.remove());
}

/* ========= Dates & Period ========= */
const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const todayISO = () => new Date().toISOString().slice(0, 10);
function startOfMonthIdx(y, m) {
  return new Date(y, m, 1);
}
function endOfMonthIdx(y, m) {
  return new Date(y, m + 1, 0, 23, 59, 59);
}
function startOfYear(d) {
  const y = d instanceof Date ? d.getFullYear() : d;
  return new Date(y, 0, 1);
}
function endOfYear(d) {
  const y = d instanceof Date ? d.getFullYear() : d;
  return new Date(y, 11, 31, 23, 59, 59);
}

/* ========= State ========= */
let IURAN = 5000;
let users = {};
let transaksi = {};

/* ========= Settings ========= */
function loadSettings() {
  return db
    .ref("settings")
    .once("value")
    .then((s) => {
      const v = s.val() || {};
      IURAN = Number(v.iuran || 5000);
      $("#iuranLabel").textContent = money(IURAN);
      $("#setIuran").value = IURAN;
      $("#setStart").value = v.start_week || "";
    });
}

/* ========= Users ========= */
function loadUsers() {
  return db
    .ref("users")
    .once("value")
    .then((s) => {
      users = s.val() || {};
      renderAnggota();
    });
}
function renderAnggota() {
  const q = ($("#cariAnggota")?.value || "").toLowerCase();
  const tbody = $("#tbodyAnggota");
  tbody.innerHTML = "";

  const list = Object.values(users)
    .filter((u) => u.role !== "admin")
    .filter(
      (u) =>
        !q ||
        u.nama.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
    )
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  $("#countAnggota").textContent = list.length;

  list.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username || ""}</td>
      <td>${u.nama || ""}</td>
      <td>${u.email || ""}</td>
      <td>${u.role || ""}</td>
      <td>
        ${
          isAdmin
            ? `
          <button class="btn small" data-act="reset" data-id="${u.username}">Reset PW</button>
          <button class="btn small" data-act="toggle" data-id="${u.username}">${
                u.aktif === false ? "Aktifkan" : "Nonaktifkan"
              }</button>
          <button class="btn small danger" data-act="hapus" data-id="${u.username}">Hapus</button>`
            : me.username === u.username
            ? `<button class="btn small" data-act="pw" data-id="${u.username}">Ganti Password</button>`
            : ""
        }
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const act = b.dataset.act;
    const id = b.dataset.id;
    if (act === "pw") {
      Swal.fire({
        title: "Ganti Password",
        input: "text",
        inputPlaceholder: "Masukkan password baru",
        showCancelButton: true,
      }).then((r) => {
        if (r.value) {
          db.ref("users/" + id + "/password")
            .set(r.value)
            .then(() => toast("success", "Password diperbarui"));
        }
      });
    }
    if (!isAdmin) return;
    if (act === "reset") {
      const email = users[id]?.email || "";
      if (!email) return toast("error", "Email kosong");
      db.ref("users/" + id + "/password")
        .set(email)
        .then(() => toast("success", "Password direset ke email"));
    } else if (act === "toggle") {
      const newAktif = users[id].aktif === false ? true : false;
      db.ref("users/" + id + "/aktif")
        .set(newAktif)
        .then(() => {
          toast("success", "Status diubah");
          loadUsers();
        });
    } else if (act === "hapus") {
      Swal.fire({
        icon: "warning",
        title: "Hapus Anggota?",
        text: "Data anggota akan dihapus permanen.",
        showCancelButton: true,
        confirmButtonText: "Ya, hapus",
      }).then((r) => {
        if (r.isConfirmed) {
          db.ref("users/" + id)
            .remove()
            .then(() => {
              toast("success", "Anggota dihapus");
              loadUsers();
            });
        }
      });
    }
  };
}

/* ========= Nav ========= */
$$(".menu a").forEach((a) => {
  a.onclick = () => {
    $$(".menu a").forEach((x) => x.classList.remove("active"));
    a.classList.add("active");
    $$(".page").forEach((x) => x.classList.remove("active"));
    $("#page-" + a.dataset.page).classList.add("active");
  };
});

/* ========= Transaksi ========= */
function transaksiArray() {
  return Object.entries(transaksi)
    .map(([id, t]) => ({ id, ...t }))
    .sort((a, b) => (a.tanggal > b.tanggal ? -1 : 1));
}
function renderTransaksi() {
  let arr = transaksiArray();
  const tbody = $("#tbody");
  tbody.innerHTML = "";
  arr.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(t.tanggal).toLocaleDateString("id-ID")}</td>
      <td>${t.nama}</td>
      <td>${t.jenis}</td>
      <td>${t.metode}</td>
      <td>${money(t.nominal)}</td>
      <td>${t.catatan || ""}</td>
      <td>${t.status || "-"}</td>
      <td>
        ${
          isAdmin
            ? `<button class="btn small" data-edit="${t.id}">Edit</button>
               <button class="btn small danger" data-del="${t.id}">Hapus</button>`
            : ""
        }
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = (e) => {
    const ed = e.target.closest("button[data-edit]");
    const del = e.target.closest("button[data-del]");
    if (ed) openEditor(ed.dataset.edit);
    if (del) deleteTransaksi(del.dataset.del);
  };
}

/* ========= Add / Edit Transaksi ========= */
function baseTransaksi(t = {}) {
  const today = todayISO();
  return {
    tanggal: t.tanggal || today,
    username: t.username || "",
    nama: t.nama || "",
    jenis: t.jenis || "setoran",
    metode: t.metode || "tunai",
    nominal: Number(t.nominal || IURAN),
    catatan: t.catatan || "",
  };
}
function openEditor(id) {
  if (!isAdmin) return;
  const isEdit = !!id;
  const data = isEdit ? baseTransaksi(transaksi[id]) : baseTransaksi();
  const options = Object.values(users)
    .filter((u) => u.role !== "admin" && u.aktif !== false)
    .map(
      (u) =>
        `<option value="${u.username}" ${
          u.username === data.username ? "selected" : ""
        }>${u.nama}</option>`
    )
    .join("");
  Swal.fire({
    title: isEdit ? "Edit Transaksi" : "Tambah Transaksi",
    html: `
      <label>Tanggal</label>
      <input id="f_tgl" type="date" class="swal2-input" value="${data.tanggal}">
      <label>Anggota</label>
      <select id="f_user" class="swal2-input"><option value="">Pilih</option>${options}</select>
      <label>Jenis</label>
      <select id="f_jenis" class="swal2-input">
        <option value="setoran">Setoran</option>
        <option value="pengeluaran">Pengeluaran</option>
      </select>
      <label>Metode</label>
      <select id="f_metode" class="swal2-input">
        <option value="tunai">Tunai</option>
        <option value="qris">QRIS</option>
      </select>
      <label>Nominal</label>
      <input id="f_nom" type="number" class="swal2-input" value="${data.nominal}">
      <label>Catatan</label>
      <input id="f_cat" class="swal2-input" value="${data.catatan}">
    `,
    preConfirm: () => {
      const tgl = $("#f_tgl").value;
      const uname = $("#f_user").value;
      const jenis = $("#f_jenis").value;
      const metode = $("#f_metode").value;
      const nominal = Number($("#f_nom").value);
      const catatan = $("#f_cat").value;
      if (!tgl || !uname || nominal <= 0)
        return Swal.showValidationMessage("Isi semua data!");
      const nama = users[uname]?.nama || uname;
      return { tanggal: tgl, username: uname, nama, jenis, metode, nominal, catatan };
    },
  }).then((r) => {
    if (!r.value) return;
    if (isEdit)
      db.ref("transaksi/" + id)
        .update(r.value)
        .then(() => toast("success", "Transaksi diupdate"));
    else {
      const key = db.ref("transaksi").push().key;
      db.ref("transaksi/" + key)
        .set({ ...r.value, id: key })
        .then(() => toast("success", "Transaksi ditambah"));
    }
  });
}
function deleteTransaksi(id) {
  if (!isAdmin) return;
  confirmBox("Hapus transaksi?", "Tindakan tidak bisa dibatalkan.").then((r) => {
    if (r.isConfirmed)
      db.ref("transaksi/" + id)
        .remove()
        .then(() => toast("success", "Dihapus"));
  });
}
$("#btnAddCash")?.addEventListener("click", () => openEditor());
$("#btnPengeluaran")?.addEventListener("click", () => {
  openEditor();
  setTimeout(() => {
    $("#f_jenis").value = "pengeluaran";
    $("#f_metode").value = "tunai";
  }, 50);
});

/* ========= Rekap ========= */
$("#btnRefreshRekap")?.addEventListener("click", renderRekap);
function renderRekap() {
  const tbody = $("#tbodyRekap");
  tbody.innerHTML = "";
  const scope = $("#rekapScope").value;
  const tahun = Number($("#rekapTahun").value);
  const bulanIdx = Number($("#rekapBulan").value);
  const q = ($("#cariNamaRekap").value || "").toLowerCase();
  const filterStatus = $("#filterStatus").value;

  const start =
    scope === "bulan" ? startOfMonthIdx(tahun, bulanIdx) : startOfYear(tahun);
  const end =
    scope === "bulan" ? endOfMonthIdx(tahun, bulanIdx) : endOfYear(tahun);
  const target = scope === "bulan" ? 4 * IURAN : 48 * IURAN;

  Object.values(users)
    .filter((u) => u.role !== "admin")
    .filter(
      (u) =>
        !q ||
        u.nama.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
    )
    .forEach((u) => {
      const paid = Object.values(transaksi)
        .filter((t) => t.username === u.username)
        .filter((t) => new Date(t.tanggal) >= start && new Date(t.tanggal) <= end)
        .filter((t) => t.jenis === "setoran" || (t.jenis === "qris" && t.status === "approved"))
        .reduce((a, b) => a + Number(b.nominal || 0), 0);
      const sisa = Math.max(target - paid, 0);
      const lunas = sisa <= 0;
      if (filterStatus === "lunas" && !lunas) return;
      if (filterStatus === "belum" && lunas) return;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nama}</td>
        <td>${money(paid)}</td>
        <td>${money(sisa)}</td>
        <td>${lunas ? "Sudah Lunas" : "Belum Lunas"}</td>`;
      tbody.appendChild(tr);
    });
}

/* ========= Init ========= */
Promise.all([loadSettings(), loadUsers()]).then(() => {
  db.ref("transaksi").on("value", (s) => {
    transaksi = s.val() || {};
    renderTransaksi();
    renderRekap();
  });
});
