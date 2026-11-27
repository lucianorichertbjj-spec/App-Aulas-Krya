import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// =========================================================================
// PASSO 1: COLE AQUI AS CHAVES DO SEU PROJETO FIREBASE (console.firebase.google.com)
// =========================================================================
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("COLE_SUA");

let app = null;
let db = null;
let auth = null;

if (isConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth, isConfigured };
