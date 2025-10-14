import { db, ref, set, onValue } from './firebase.js';

// Seed admin jika /users kosong (jalan sekali)
onValue(ref(db, 'users'), async (snap) => {
  if (!snap.exists()) {
    await set(ref(db, 'users/admin'), {
      username: 'admin',
      password: '12345',   // ganti kalau mau lebih aman
      role: 'admin'
    });
    console.log('Seeded default admin');
  }
}, { onlyOnce: true });

// Kalau sudah login, langsung ke dashboard
if (localStorage.getItem('kk_active_user')) {
  location.replace('index.html');
}

// Tabs
const tabLogin  = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const pLogin  = document.getElementById('panelLogin');
const pSignup = document.getElementById('panelSignup');
tabLogin.onclick  = ()=>{tabLogin.classList.add('active'); tabSignup.classList.remove('active'); pLogin.classList.add('active'); pSignup.classList.remove('active');};
tabSignup.onclick = ()=>{tabSignup.classList.add('active'); tabLogin.classList.remove('active'); pSignup.classList.add('active'); pLogin.classList.remove('active');};

// Login
document.getElementById('btnLogin').onclick = () => {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  if (!u || !p) return alert('Lengkapi username & password.');

  onValue(ref(db, 'users/' + u), (snap) => {
    if (!snap.exists()) return alert('Username atau password salah!');
    const user = snap.val();
    if (user.password !== p) return alert('Username atau password salah!');
    localStorage.setItem('kk_active_user', JSON.stringify({ username: user.username, role: user.role }));
    document.body.style.opacity = '0';
    setTimeout(()=>location.replace('index.html'), 120);
  }, { onlyOnce: true });
};

// Signup (anggota)
document.getElementById('btnSignup').onclick = async () => {
  const u = document.getElementById('regUser').value.trim();
  const p = document.getElementById('regPass').value.trim();
  if (!u || !p) return alert('Lengkapi data.');
  if (p.length < 4) return alert('Password minimal 4 karakter.');

  onValue(ref(db, 'users/' + u), async (snap) => {
    if (snap.exists()) return alert('Username sudah dipakai.');
    await set(ref(db, 'users/' + u), { username: u, password: p, role: 'anggota' });
    alert('Akun dibuat. Silakan login.');
    tabLogin.click();
  }, { onlyOnce: true });
};
