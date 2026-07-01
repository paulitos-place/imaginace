import { auth } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

console.log("SCRIPT GELADEN");

const loginScreen = document.getElementById("loginScreen");
const website = document.getElementById("website");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

function showWebsite() {
  loginScreen.style.display = "none";
  website.style.display = "block";
}

function showLogin() {
  loginScreen.style.display = "flex";
  website.style.display = "none";
}

// Firebase Auth braucht eine E-Mail -> Username wird intern umgewandelt.
// (Provisorisch, bis ein eigenes Firestore-Benutzerprofilsystem kommt.)
function usernameToEmail(username) {
  return username.trim().toLowerCase() + "@imaginace.local";
}

function validInput(username, password) {
  if (!username || !password) {
    loginMessage.textContent = "Bitte Username und Passwort eingeben.";
    return false;
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    loginMessage.textContent = "Username: 3-20 Zeichen, nur Buchstaben, Zahlen, _.";
    return false;
  }
  if (password.length < 6) {
    loginMessage.textContent = "Passwort muss mindestens 6 Zeichen haben.";
    return false;
  }
  return true;
}

registerBtn.addEventListener("click", () => {
  const username = usernameInput.value;
  const password = passwordInput.value;
  loginMessage.textContent = "";

  if (!validInput(username, password)) return;

  createUserWithEmailAndPassword(auth, usernameToEmail(username), password)
    .then(() => {
      loginMessage.textContent = "Registrierung erfolgreich! Du bist eingeloggt.";
    })
    .catch((error) => {
      loginMessage.textContent = "Fehler bei Registrierung: " + error.message;
    });
});

loginBtn.addEventListener("click", () => {
  const username = usernameInput.value;
  const password = passwordInput.value;
  loginMessage.textContent = "";

  if (!validInput(username, password)) return;

  signInWithEmailAndPassword(auth, usernameToEmail(username), password)
    .then(() => {
      loginMessage.textContent = "";
    })
    .catch((error) => {
      loginMessage.textContent = "Fehler beim Login: " + error.message;
    });
});

// Automatisch weiterleiten, wenn Session besteht / sich der Login-Status ändert
onAuthStateChanged(auth, (user) => {
  if (user) {
    showWebsite();
  } else {
    showLogin();
  }
});

// Restliche Buttons (vorher inline onclick, jetzt sauber über addEventListener,
// weil script.js als Modul keine globalen Funktionen mehr bereitstellt)
const sendMessageBtn = document.getElementById("sendMessageBtn");
const addFriendBtn = document.getElementById("addFriendBtn");
const blockBtn = document.getElementById("blockBtn");
const gbInput = document.getElementById("gb");
const gbSubmit = document.getElementById("gbSubmit");

if (sendMessageBtn) sendMessageBtn.addEventListener("click", () => alert("Message sent"));
if (addFriendBtn) addFriendBtn.addEventListener("click", () => alert("Added!"));
if (blockBtn) blockBtn.addEventListener("click", () => alert("Blocked!"));

if (gbSubmit) {
  gbSubmit.addEventListener("click", () => {
    if (gbInput.value.trim() === "") return;
    alert("Danke fürs Unterschreiben: " + gbInput.value);
    gbInput.value = "";
  });
}