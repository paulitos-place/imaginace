import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword
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

// ---------- FARBAUSWAHL (Login-Screen) ----------

const CHAT_COLORS = [
  "#ff6b6b", "#6fb8ff", "#8cff8c", "#ffcc66",
  "#ff8cff", "#66ffff", "#ffa500", "#c299ff"
];

let selectedColor = CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)];

const colorPicker = document.getElementById("colorPicker");

function renderColorPicker() {
  colorPicker.innerHTML = "";
  CHAT_COLORS.forEach((color) => {
    const swatch = document.createElement("div");
    swatch.className = "colorSwatch" + (color === selectedColor ? " selected" : "");
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener("click", () => {
      selectedColor = color;
      renderColorPicker();
    });
    colorPicker.appendChild(swatch);
  });
}
renderColorPicker();

// ---------- LOGIN / REGISTER / LOGOUT ----------

const loginScreen = document.getElementById("loginScreen");
const website = document.getElementById("website");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginMessage = document.getElementById("loginMessage");
const registerBtn = document.getElementById("register");
const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logoutBtn");

let currentUsername = null;
let currentUid = null;
let currentUserColor = "#8cff8c";
let profileReady = false;

let pendingColorUpdate = null;
let authGeneration = 0;

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
      await setDoc(doc(db, "users", uid), {
        username: username,
        color: selectedColor,
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

  pendingColorUpdate = selectedColor;

  signInWithEmailAndPassword(auth, usernameToEmail(username), password)
    .catch((error) => {
      pendingColorUpdate = null;
      loginMessage.textContent = "Fehler beim Login: " + error.message;
    });
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).catch((error) => {
      alert("Fehler beim Logout: " + error.message);
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  const myGeneration = ++authGeneration;

  if (user) {
    currentUid = user.uid;
    profileReady = false;
    setChatInputState(false);

    try {
      if (pendingColorUpdate) {
        await setDoc(doc(db, "users", user.uid), { color: pendingColorUpdate }, { merge: true });
        pendingColorUpdate = null;
      }

      const profileSnap = await getDoc(doc(db, "users", user.uid));

      if (myGeneration !== authGeneration) return;

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        currentUsername = data.username;
        currentUserColor = data.color || "#8cff8c";
      } else {
        currentUsername = user.email.split("@")[0];
        currentUserColor = "#8cff8c";
      }
    } catch (e) {
      if (myGeneration !== authGeneration) return;
      currentUsername = user.email.split("@")[0];
      currentUserColor = "#8cff8c";
    }

    if (myGeneration !== authGeneration) return;

    profileReady = true;
    setChatInputState(true);

    showWebsite();
    resetChat();
    initChat();
  } else {
    currentUid = null;
    currentUsername = null;
    profileReady = false;
    setChatInputState(false);
    resetChat();
    showLogin();
  }
});

// ---------- PASSWORT ÄNDERN ----------

const changePasswordBtn = document.getElementById("changePasswordBtn");
const changePasswordBox = document.getElementById("changePasswordBox");
const changePasswordCancel = document.getElementById("changePasswordCancel");
const changePasswordSubmit = document.getElementById("changePasswordSubmit");
const changePasswordMessage = document.getElementById("changePasswordMessage");
const oldPasswordInput = document.getElementById("oldPassword");
const newPasswordInput = document.getElementById("newPassword");

changePasswordBtn.addEventListener("click", () => {
  oldPasswordInput.value = "";
  newPasswordInput.value = "";
  changePasswordMessage.textContent = "";
  changePasswordBox.classList.remove("hidden");
});

changePasswordCancel.addEventListener("click", () => {
  changePasswordBox.classList.add("hidden");
});

changePasswordSubmit.addEventListener("click", async () => {
  const oldPassword = oldPasswordInput.value;
  const newPassword = newPasswordInput.value;
  changePasswordMessage.textContent = "";

  if (!oldPassword || !newPassword) {
    changePasswordMessage.textContent = "Bitte beide Felder ausfüllen.";
    return;
  }
  if (newPassword.length < 6) {
    changePasswordMessage.textContent = "Neues Passwort muss mindestens 6 Zeichen haben.";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    changePasswordMessage.textContent = "Du bist nicht eingeloggt.";
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    changePasswordMessage.textContent = "Passwort erfolgreich geändert!";
    oldPasswordInput.value = "";
    newPasswordInput.value = "";
  } catch (error) {
    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      changePasswordMessage.textContent = "Aktuelles Passwort ist falsch.";
    } else {
      changePasswordMessage.textContent = "Fehler: " + error.message;
    }
  }
});

// ---------- VIP CODE ----------

const VIP_CODE = "ofwgkta";
let isVip = localStorage.getItem("imaginace_vip") === "true";

const vipToggle = document.getElementById("vipToggle");
const vipPopup = document.getElementById("vipPopup");
const vipCodeInput = document.getElementById("vipCodeInput");
const vipCodeSubmit = document.getElementById("vipCodeSubmit");
const vipCodeCancel = document.getElementById("vipCodeCancel");
const vipCodeMessage = document.getElementById("vipCodeMessage");

vipToggle.addEventListener("click", () => {
  vipCodeInput.value = "";
  vipCodeMessage.textContent = isVip ? "Du bist bereits VIP! 👑" : "";
  vipPopup.classList.remove("hidden");
});

vipCodeCancel.addEventListener("click", () => {
  vipPopup.classList.add("hidden");
});

vipCodeSubmit.addEventListener("click", () => {
  const val = vipCodeInput.value.trim().toLowerCase();
  if (val === VIP_CODE) {
    isVip = true;
    localStorage.setItem("imaginace_vip", "true");
    vipCodeMessage.textContent = "Code korrekt! Du bist jetzt VIP 👑";
  } else {
    vipCodeMessage.textContent = "Falscher Code.";
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
    alert("Danke fuers Unterschreiben: " + gbInput.value);
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
const chatBadge = document.getElementById("chatBadge");

const PAGE_SIZE = 20;

let chatInitialized = false;
let unsubscribeChat = null;
let recentMessages = [];
let olderMessages = [];
let paginationCursor = null;
let hasMoreOlder = true;
let isLoadingOlder = false;
let firstSnapshotHandled = false;
let isChatOpen = false;

function setChatInputState(enabled) {
  chatInput.disabled = !enabled;
  chatSend.disabled = !enabled;
  chatInput.placeholder = enabled ? "Nachricht..." : "Profil wird geladen...";
}
setChatInputState(false);

function showChatBadge() {
  chatBadge.classList.remove("hidden");
}

function hideChatBadge() {
  chatBadge.classList.add("hidden");
}

chatToggle.addEventListener("click", () => {
  chatPopup.classList.remove("hidden");
  isChatOpen = true;
  hideChatBadge();
  scrollChatToBottom();
});

chatClose.addEventListener("click", () => {
  chatPopup.classList.add("hidden");
  isChatOpen = false;
});

chatInput.addEventListener("input", () => {
  chatCharCount.textContent = chatInput.value.length + "/100";
});

function sendChatMessage() {
  if (!profileReady || !currentUsername || !currentUid) return;

  const text = chatInput.value.trim();
  if (text === "" || text.length > 100) return;

  addDoc(collection(db, "messages"), {
    text: text,
    username: currentUsername,
    color: currentUserColor,
    uid: currentUid,
    vip: isVip,
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

function resetChat() {
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }
  chatInitialized = false;
  recentMessages = [];
  olderMessages = [];
  paginationCursor = null;
  hasMoreOlder = true;
  firstSnapshotHandled = false;
}

function initChat() {
  if (chatInitialized) return;
  chatInitialized = true;

  const messagesRef = collection(db, "messages");
  const recentQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(PAGE_SIZE));

  unsubscribeChat = onSnapshot(recentQuery, (snapshot) => {
    const docsDesc = snapshot.docs;
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
    } else {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.uid !== currentUid && !isChatOpen) {
            showChatBadge();
          }
        }
      });
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
    console.error("Fehler beim Laden aelterer Nachrichten:", e);
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
    userSpan.style.color = msg.color || "#8cff8c";
    div.appendChild(userSpan);

    if (msg.vip) {
      const crown = document.createElement("img");
      crown.src = "https://i.pinimg.com/originals/05/b9/cc/05b9cc72b0271b8441200e288767850e.jpg";
      crown.className = "crownIcon";
      crown.alt = "VIP";
      div.appendChild(crown);
    }

    const timeSpan = document.createElement("span");
    timeSpan.className = "chat-time";
    timeSpan.textContent = formatTime(msg.timestamp);
    const textNode = document.createTextNode(" " + (msg.text || ""));

    div.appendChild(timeSpan);
    div.appendChild(textNode);
    chatMessages.appendChild(div);
  });

  if (scrollToBottom && wasNearBottom) {
    scrollChatToBottom();
  } else if (!scrollToBottom) {
    const newScrollHeight = chatMessages.scrollHeight;
    chatMessages.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
  }
}

function scrollChatToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}