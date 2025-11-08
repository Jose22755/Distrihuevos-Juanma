// auth.js
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// --- REGISTRO ---
export async function registerUser(nombre, direccion, email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      nombre,
      direccion,
      email
    });

    alert("✅ Usuario registrado con éxito");
    return user;
  } catch (error) {
    alert("❌ Error en registro: " + error.message);
    console.error(error);
  }
}

// --- LOGIN ---
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    alert("✅ Bienvenido " + user.email);
    return user;
  } catch (error) {
    alert("❌ Error en login: " + error.message);
    console.error(error);
  }
}
