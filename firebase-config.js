import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAkY5_Tddklh7RsQXiWcMDrZH7kwyO9ers",
  authDomain: "pdv-tia-linda.firebaseapp.com",
  projectId: "pdv-tia-linda",
  storageBucket: "pdv-tia-linda.firebasestorage.app",
  messagingSenderId: "57429634705",
  appId: "1:57429634705:web:890b251a87988ef8985930"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export const auth = getAuth(app);