<!-- FIREBASE.JS -->
<script src="https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js"></script>
<script>
  // KONEKSI FIREBASE (Realtime Database + Storage)
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
</script>
