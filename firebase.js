// Firebase (v8) – bekerja di GitHub Pages tanpa module/import
const firebaseConfig = {
  apiKey: "AIzaSyCv-ki8V75XjFZ-6E9S2Q49SLsVKh5YtKg",
  authDomain: "kaskelasa-e9c8b.firebaseapp.com",
  databaseURL: "https://kaskelasa-e9c8b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kaskelasa-e9c8b",
  storageBucket: "kaskelasa-e9c8b.appspot.com",
  messagingSenderId: "20448185139",
  appId: "1:20448185139:web:99a5d1c81c1a61650e4c46"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

// Konfigurasi iuran mingguan (boleh diubah via “Pengaturan” di dashboard)
const DEFAULT_IURAN = 5000;
