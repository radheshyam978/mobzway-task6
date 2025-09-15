// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
  apiKey: "AIzaSyC94Jyt_bMWfHEl-ZyElY8clJC0oN6uw0o",
  authDomain: "to-do-app-79014.firebaseapp.com",
  databaseURL: "https://to-do-app-79014-default-rtdb.firebaseio.com",
  projectId: "to-do-app-79014",
  storageBucket: "to-do-app-79014.firebasestorage.app",
  messagingSenderId: "330911128193",
  appId: "1:330911128193:web:41564a0ef6e0d1b1794b80",
  measurementId: "G-BYREDX0N9V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
