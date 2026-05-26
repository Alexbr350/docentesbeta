import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC-BF2a1Mwr9JEu_YzGTKQme7xMapZ_WOs",
  authDomain: "docentesbeta-b1f32.firebaseapp.com",
  projectId: "docentesbeta-b1f32",
  storageBucket: "docentesbeta-b1f32.firebasestorage.app",
  messagingSenderId: "471440214860",
  appId: "1:471440214860:web:28ee020d163ded4e495de9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  hd: "ensfa.edu.mx"
});
export const db = getFirestore(app);