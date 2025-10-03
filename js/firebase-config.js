
// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBdSAJNELZLQl_IUEj3Vz_loxpIInqBdro",
  authDomain: "distrihuevos-juanma.firebaseapp.com",
  projectId: "distrihuevos-juanma",
  storageBucket: "distrihuevos-juanma.firebasestorage.app",
  messagingSenderId: "1022538352131",
  appId: "1:1022538352131:web:d471df1b8530fa9d96f036"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar auth y db para usarlos en login/register
export const auth = getAuth(app);
export const db = getFirestore(app);
