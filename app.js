// app.js
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

// Sign Up Function
document.getElementById('signupBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('User created:', user.uid);

    // Save user info to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: user.email === 'admin@gmail.com' ? 'admin' : 'worker',
      createdAt: new Date(),
    });

    alert('Sign up successful! Please log in.');
  } catch (error) {
    console.error('Error signing up:', error);
    alert(error.message);
  }
});

// Login Function
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('User logged in:', user.uid);

    // Redirect user based on their role
    if (user.email === 'admin@gmail.com') {
      window.location.href = 'admin.html';  // Redirect to admin page
    } else {
      window.location.href = 'worker.html';  // Redirect to worker page
    }
  } catch (error) {
    console.error('Error logging in:', error);
    alert(error.message);
  }
});
