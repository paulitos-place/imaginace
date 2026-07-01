import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("SCRIPT GELADEN");

// ---------- LOGIN / REGISTER ----------

const loginScreen = document.getElementById("loginScreen");
const website = document.getElementById("website");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");

let currentUsername = null;
let currentUid = null;

function showWebsite() {
  loginScreen.style.display = "none";
  website.style.display = "block";
}

function showLogin() {
  loginScreen.style.display = "flex";
  website.style.display = "none";
}

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
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  loginMessage.textContent = "";

  if (!validInput(username, password)) return;

  createUserWithEmailAndPassword(auth, usernameToEmail(username), password)
    .then(async (userCredential) => {
      const uid = userCredential.user.uid;
      // Username dauerhaft speichern - wird danach NIE wieder verändert
      await setDoc(doc(db, "users", uid), {
        username: username,
        createdAt: serverTimestamp()
      });
      loginMessage.textContent = "Registrierung erfolgreich!";
    })
    .catch((error) => {
      loginMessage.textContent = "Fehler bei Registrierung: " + error.message;
    });
});

loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUid = user.uid;
    try {
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      if (profileSnap.exists()) {
        currentUsername = profileSnap.data().username;
      } else {
        // Fallback für ältere Accounts ohne Profil-Dokument
        currentUsername = user.email.split("@")[0];
      }
    } catch (e) {
      currentUsername = user.email.split("@")[0];
    }
    showWebsite();
    initChat();
  } else {
    currentUid = null;
    currentUsername = null;
    showLogin();
  }
});

// ---------- SONSTIGE BUTTONS ----------

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

// ---------- CHAT ----------

const chatToggle = document.getElementById("chatToggle");
const chatPopup = document.getElementById("chatPopup");
const chatClose = document.getElementById("chatClose");
const chatMessages = document.getElementById("chatMessages");
const chatLoadingOlder = document.getElementById("chatLoadingOlder");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatCharCount = document.getElementById("chatCharCount");

const PAGE_SIZE = 20;

let chatInitialized = false;
let unsubscribeChat = null;
let recentMessages = [];   // aktuelle "Live"-Nachrichten (aufsteigend sortiert)
let olderMessages = [];    // per Pagination nachgeladene ältere Nachrichten (aufsteigend)
let paginationCursor = null; // Firestore-DocumentSnapshot als Ladepunkt für "älter"
let hasMoreOlder = true;
let isLoadingOlder = false;
let firstSnapshotHandled = false;

chatToggle.addEventListener("click", () => {
  chatPopup.classList.remove("hidden");
  scrollChatToBottom();
});

chatClose.addEventListener("click", () => {
  chatPopup.classList.add("hidden");
});

chatInput.addEventListener("input", () => {
  chatCharCount.textContent = chatInput.value.length + "/100";
});

function sendChatMessage() {
  const text = chatInput.value.trim();
  if (text === "" || text.length > 100 || !currentUid) return;

  addDoc(collection(db, "messages"), {
    text: text,
    username: currentUsername,
    uid: currentUid,
    timestamp: serverTimestamp()
  }).then(() => {
    chatInput.value = "";
    chatCharCount.textContent = "0/100";
  }).catch((err) => {
    alert("Nachricht konnte nicht gesendet werden: " + err.message);
  });
}

chatSend.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

function initChat() {
  if (chatInitialized) return;
  chatInitialized = true;

  const messagesRef = collection(db, "messages");
  const recentQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(PAGE_SIZE));

  unsubscribeChat = onSnapshot(recentQuery, (snapshot) => {
    const docsDesc = snapshot.docs; // neueste zuerst
    recentMessages = docsDesc
      .slice()
      .reverse()
      .map((d) => ({ id: d.id, ...d.data() }));

    if (!firstSnapshotHandled) {
      firstSnapshotHandled = true;
      if (docsDesc.length > 0) {
        paginationCursor = docsDesc[docsDesc.length - 1];
      }
      hasMoreOlder = docsDesc.length === PAGE_SIZE;
    }

    renderMessages(true);
  }, (error) => {
    console.error("Chat-Fehler:", error);
  });

  chatMessages.addEventListener("scroll", () => {
    if (chatMessages.scrollTop < 40) {
      loadOlderMessages();
    }
  });
}

async function loadOlderMessages() {
  if (isLoadingOlder || !hasMoreOlder || !paginationCursor) return;
  isLoadingOlder = true;
  chatLoadingOlder.classList.remove("hidden");

  try {
    const messagesRef = collection(db, "messages");
    const olderQuery = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      startAfter(paginationCursor),
      limit(PAGE_SIZE)
    );
    const snapshot = await getDocs(olderQuery);
    const docsDesc = snapshot.docs;

    if (docsDesc.length > 0) {
      const newOlder = docsDesc
        .slice()
        .reverse()
        .map((d) => ({ id: d.id, ...d.data() }));
      olderMessages = newOlder.concat(olderMessages);
      paginationCursor = docsDesc[docsDesc.length - 1];
    }
    hasMoreOlder = docsDesc.length === PAGE_SIZE;

    renderMessages(false);
  } catch (e) {
    console.error("Fehler beim Laden älterer Nachrichten:", e);
  } finally {
    isLoadingOlder = false;
    chatLoadingOlder.classList.add("hidden");
  }
}

function formatTime(ts) {
  if (!ts || !ts.toDate) return "";
  const d = ts.toDate();
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderMessages(scrollToBottom) {
  const wasNearBottom =
    chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;
  const prevScrollHeight = chatMessages.scrollHeight;
  const prevScrollTop = chatMessages.scrollTop;

  const all = olderMessages.concat(recentMessages);

  chatMessages.innerHTML = "";
  chatMessages.appendChild(chatLoadingOlder);

  all.forEach((msg) => {
    const div = document.createElement("div");
    div.className = "chat-msg";
    const userSpan = document.createElement("span");
    userSpan.className = "chat-user";
    userSpan.textContent = (msg.username || "???") + ":";
    const timeSpan = document.createElement("span");
    timeSpan.className = "chat-time";
    timeSpan.textContent = formatTime(msg.timestamp);
    const textNode = document.createTextNode(" " + (msg.text || ""));

    div.appendChild(userSpan);
    div.appendChild(timeSpan);
    div.appendChild(textNode);
    chatMessages.appendChild(div);
  });

  if (scrollToBottom && wasNearBottom) {
    scrollChatToBottom();
  } else if (!scrollToBottom) {
    // Scrollposition beim Nachladen älterer Nachrichten stabil halten
    const newScrollHeight = chatMessages.scrollHeight;
    chatMessages.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
  }
}

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


