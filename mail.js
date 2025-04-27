const firebaseConfig = {
  apiKey: "AIzaSyA5h26hiZRX2WA3tRCjUY2NlA6rnRV0E24",
  authDomain: "namozag-3b281.firebaseapp.com",
  databaseURL: "https://namozag-3b281-default-rtdb.firebaseio.com",
  projectId: "namozag-3b281",
  storageBucket: "namozag-3b281.firebasestorage.app",
  messagingSenderId: "183249580094",
  appId: "1:183249580094:web:af1070013478332698616f",
  measurementId: "G-CE1RNHKMQG"
};

// initialize firebase
firebase.initializeApp(firebaseConfig);

// reference your database
var contactFormDB = firebase.database().ref("contactForm");

document.getElementById("contactForm").addEventListener("submit", submitForm);

function submitForm(e) {
  e.preventDefault();

  var name = getElementVal("name");
  var emailid = getElementVal("emailid");
  var msgContent = getElementVal("msgContent");

  saveMessages(name, emailid, msgContent);

  //   enable alert
  document.querySelector(".alert").style.display = "block";

  //   remove the alert
  setTimeout(() => {
    document.querySelector(".alert").style.display = "none";
  }, 3000);

  //   reset the form
  document.getElementById("contactForm").reset();
}

const saveMessages = (name, emailid, msgContent) => {
  var newContactForm = contactFormDB.push();

  newContactForm.set({
    name: name,
    emailid: emailid,
    msgContent: msgContent,
  });
};

const getElementVal = (id) => {
  return document.getElementById(id).value;
};
