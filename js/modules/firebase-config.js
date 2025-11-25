// js/modules/firebase-config.js

// ⚠️ REEMPLAZA ESTOS VALORES CON TUS PROPIAS CREDENCIALES DE CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCfM2KIz5LvLF-5e9mf18i6jsm1u9kaAOE",
  authDomain: "gestiondehorarios-50d8a.firebaseapp.com",
  projectId: "gestiondehorarios-50d8a",
  storageBucket: "gestiondehorarios-50d8a.firebasestorage.app",
  messagingSenderId: "668402273794",
  appId: "1:668402273794:web:2e02d000f59bf5cb81e11b"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);

// Exportar los módulos de Firebase que usaremos
export const auth = firebase.auth(); 
export const db = firebase.firestore();