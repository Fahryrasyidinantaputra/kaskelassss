import { db, ref, set, onValue } from './firebase.js';

// tab switch
const tabLogin=document.getElementById('tabLogin');
const tabSignup=document.getElementById('tabSignup');
const loginForm=document.getElementById('loginForm');
const signupForm=document.getElementById('signupForm');

tabLogin.onclick=()=>{tabLogin.classList.add('active');tabSignup.classList.remove('active');
loginForm.style.display='block';signupForm.style.display='none';};
tabSignup.onclick=()=>{tabSignup.classList.add('active');tabLogin.classList.remove('active');
signupForm.style.display='block';loginForm.style.display='none';};

// sudah login?
if(localStorage.getItem('kk_active_user')) location.href='index.html';

// login
document.getElementById('btnLogin').onclick=()=>{
  const u=document.getElementById('loginUser').value.trim();
  const p=document.getElementById('loginPass').value.trim();
  if(!u||!p) return alert('Lengkapi username dan password!');
  onValue(ref(db,'users'),snap=>{
    const users=snap.val()||{};
    const user=users[u];
    if(!user||user.password!==p) return alert('Username atau password salah!');
    localStorage.setItem('kk_active_user',JSON.stringify({username:user.username,role:user.role}));
    document.body.style.opacity='0';
    setTimeout(()=>location.href='index.html',200);
  },{onlyOnce:true});
};

// signup
document.getElementById('btnSignup').onclick=()=>{
  const u=document.getElementById('regUser').value.trim();
  const p=document.getElementById('regPass').value.trim();
  if(!u||!p) return alert('Lengkapi username & password!');
  onValue(ref(db,'users/'+u),snap=>{
    if(snap.exists()) return alert('Username sudah digunakan!');
    set(ref(db,'users/'+u),{username:u,password:p,role:'anggota'});
    alert('Akun berhasil dibuat, silakan login.');
    tabLogin.click();
  },{onlyOnce:true});
};
