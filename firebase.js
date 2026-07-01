import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
getAuth 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



const firebaseConfig = {

apiKey: "AIzaSyBXP06yiuaZrwqcnIsWYIiuXIWZLVCcNTs",

authDomain: "imaginace-chat.firebaseapp.com",

projectId: "imaginace-chat",

storageBucket: "imaginace-chat.firebasestorage.app",

messagingSenderId: "52473888189",

appId: "1:52473888189:web:6d681ee7f299a2092566d4"

};



const app = initializeApp(firebaseConfig);



export const auth = getAuth(app);

export const db = getFirestore(app);