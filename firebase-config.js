// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5h26hiZRX2WA3tRCjUY2NlA6rnRV0E24",
  authDomain: "namozag-3b281.firebaseapp.com",
  databaseURL: "https://namozag-3b281-default-rtdb.firebaseio.com",
  projectId: "namozag-3b281",
  storageBucket: "namozag-3b281.firebasestorage.app",
  messagingSenderId: "183249580094",
  appId: "1:183249580094:web:af1070013478332698616f",
  measurementId: "G-CE1RNHKMQG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase Auth and Firestore instances
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new firebase.auth.GoogleAuthProvider();

export { auth, db };
