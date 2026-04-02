import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }            from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyDJfbyTrNZDUVon_KEvUe0lbXHGbOpjlqc",
  authDomain:        "navonma-invoice-generator.firebaseapp.com",
  projectId:         "navonma-invoice-generator",
  storageBucket:     "navonma-invoice-generator.firebasestorage.app",
  messagingSenderId: "772880642137",
  appId:             "1:772880642137:web:edeccac2467117c51e0148",
  measurementId:     "G-7523LP7TJV"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* Watch auth state — show/hide screens accordingly */
onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display    = 'flex';
    document.getElementById('user-email').textContent     = user.email;
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-shell').style.display    = 'none';
  }
});

/* Login handler — called from the button */
window.doLogin = async () => {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.textContent = '';
  btn.disabled      = true;
  btn.textContent   = 'Signing in…';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    /* onAuthStateChanged above will handle the UI transition */
  } catch (err) {
    const msgs = {
      'auth/invalid-credential':      'Incorrect email or password.',
      'auth/user-not-found':          'No account found for this email.',
      'auth/wrong-password':          'Incorrect password.',
      'auth/invalid-email':           'Please enter a valid email address.',
      'auth/too-many-requests':       'Too many attempts. Try again later.',
      'auth/network-request-failed':  'Network error. Check your connection.',
    };
    errEl.textContent = msgs[err.code] || 'Login failed. Please try again.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
};

/* Sign-out handler */
window.doLogout = () => signOut(auth);

/* Allow pressing Enter to submit */
window.loginKeydown = e => { if (e.key === 'Enter') window.doLogin(); };
