
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
  "projectId": "studio-4372731776-b1dca",
  "appId": "1:609606570185:web:bab1f011e696fefe2a3d18",
  "apiKey": "AIzaSyBgEIxlJow4rUYveZAv8W3116wkACWSj0U",
  "authDomain": "studio-4372731776-b1dca.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "609606570185"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


export { app, db, auth, onAuthStateChanged, type User };
