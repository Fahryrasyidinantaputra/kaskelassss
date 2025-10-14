// Import modul Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { 
  getDatabase, ref, set, push, onValue, update, remove 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

// Konfigurasi Firebase proyek kamu
const firebaseConfig = {
  apiKey: "AIzaSyCv-ki8V75XjFZ-6E9S2Q49SLsVKh5YtKg",
  authDomain: "kaskelasa-e9c8b.firebaseapp.com",
  databaseURL: "https://kaskelasa-e9c8b-default-rtdb.asia-southeast1.firebasedatabase.app/", // 🔥 tambahkan URL database!
  projectId: "kaskelasa-e9c8b",
  storageBucket: "kaskelasa-e9c8b.appspot.com",
  messagingSenderId: "20448185139",
  appId: "1:20448185139:web:99a5d1c81c1a61650e4c46"
};

// Inisialisasi Firebase dan Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Ekspor agar bisa dipakai di script.js
export { db, ref, set, push, onValue, update, remove };
