import { auth } from "./firebase.js";

import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";



alert("script läuft");



const username = document.getElementById("username");
const password = document.getElementById("password");



document.getElementById("register").onclick = function(){


let user = username.value;
let pass = password.value;


console.log("Register gedrückt");


createUserWithEmailAndPassword(
auth,
user + "@imaginace.fake",
pass
)

.then(()=>{

console.log("Account erstellt");

showWebsite();

})

.catch((error)=>{

alert(error.message);

});


};






document.getElementById("login").onclick = function(){


let user = username.value;
let pass = password.value;


console.log("Login gedrückt");


signInWithEmailAndPassword(

auth,

user + "@imaginace.fake",

pass

)

.then(()=>{


console.log("Login erfolgreich");

showWebsite();


})


.catch((error)=>{


alert("Login Fehler: " + error.message);


});


};






function showWebsite(){


document.getElementById("loginScreen").style.display="none";


document.getElementById("website").style.display="block";


}