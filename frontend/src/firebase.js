// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAREGJNIxWfygBFsAeZCOgGiQB7il_oHSM",
  authDomain: "zentra-22044.firebaseapp.com",
  projectId: "zentra-22044",
  storageBucket: "zentra-22044.firebasestorage.app",
  messagingSenderId: "602370543083",
  appId: "1:602370543083:web:5424de2d2f27a7a5641dae",
  measurementId: "G-T6787BFCNW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Add scopes to ensure we get profile information including photo
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Set custom parameters to ensure we get the profile picture
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { app, analytics, auth, googleProvider };
