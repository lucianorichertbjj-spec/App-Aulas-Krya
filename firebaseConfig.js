import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rihcrmjdryqjyuxqdapk.supabase.co';
const supabaseKey = 'sb_publishable_ZD9Lf2vJhoTUKXs1jl971A_viY2Ql9A';

export const supabase = createClient(supabaseUrl, supabaseKey);
 PROJETO FIREBASE (console.firebase.google.com)
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
