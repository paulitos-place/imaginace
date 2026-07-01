let count = 0;


setInterval(()=>{

count++;

document.getElementById("counter").innerText=count;


},1000);



function signGuestbook(){

let value=document.getElementById("gb").value;

alert("Signed: "+value);


}