let count = 0;


setInterval(()=>{

count++;

document.getElementById("counter").innerText=count;


},1000);



function signGuestbook(){

let value=document.getElementById("gb").value;

alert("Signed: "+value);


}

import { auth } from "./firebase.js";


import {

createUserWithEmailAndPassword,

signInWithEmailAndPassword


} from 

"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";





let usernameInput =
document.getElementById("username");


let passwordInput =
document.getElementById("password");





document.getElementById("register").onclick = ()=>{


let username = usernameInput.value;


let password = passwordInput.value;



if(username.length < 3){

alert("Username too short");

return;

}



createUserWithEmailAndPassword(

auth,

username+"@imaginace.fake",

password


)


.then(()=>{


alert("Account created");


showWebsite();


})


.catch(e=>{


alert(e.message);


});


};







document.getElementById("login").onclick = ()=>{


let username=usernameInput.value;


let password=passwordInput.value;




signInWithEmailAndPassword(

auth,

username+"@imaginace.fake",

password


)


.then(()=>{


showWebsite();


})


.catch(()=>{


alert("wrong login");


});


};






function showWebsite(){


document.getElementById("loginScreen").style.display="none";


document.getElementById("website").style.display="block";


}