import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAD65w_hKso6PDhWu_rAQ1XlB7J0QHTLkE",
  authDomain: "amg-afaq.firebaseapp.com",
  projectId: "amg-afaq",
  storageBucket: "amg-afaq.firebasestorage.app",
  messagingSenderId: "635159422885",
  appId: "1:635159422885:web:2e77e1f88de9f66d7eaa4c",
  measurementId: "G-9ND58XR0NR",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
