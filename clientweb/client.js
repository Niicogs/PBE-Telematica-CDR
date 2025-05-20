// Poner aquí la IP y puerto del servidor NodeJS
const SERVER_URL = "http://10.0.2.2:3000";

let authenticatedUid = null;

function authenticate() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const loginMessage = document.getElementById("loginMessage");

  if (!username || !password) {
    loginMessage.style.color = "red";
    loginMessage.textContent = "Please enter username and password.";
    return;
  }


  const url = `${SERVER_URL}/authenticate?uid=${encodeURIComponent(password)}`;

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          const user = JSON.parse(xhr.responseText);
          if (user.name === username) {
            loginMessage.style.color = "green";
            loginMessage.textContent = "Login successful!";
            authenticatedUid = user.student_id;
            document.getElementById("login").style.display = "none";
            document.getElementById("querySection").style.display = "block";
          } else {
            loginMessage.style.color = "red";
            loginMessage.textContent = "Username does not match the student ID.";
          }
        } catch (e) {
          loginMessage.style.color = "red";
          loginMessage.textContent = "Error parsing server response.";
        }
      } else {
        let errorMsg = "Login failed.";
        try {
          errorMsg = JSON.parse(xhr.responseText).error || errorMsg;
        } catch {}
        loginMessage.style.color = "red";
        loginMessage.textContent = errorMsg;
      }
    }
  };
  xhr.send();
}

function sendQuery() {
  const table = document.getElementById("tableSelect").value;
  const query = document.getElementById("queryInput").value.trim();
  const resultsEl = document.getElementById("results");

  if (!authenticatedUid) {
    resultsEl.textContent = "You must be logged in.";
    return;
  }



  let fullQuery = query;
  if (table === "marks") {
    if (fullQuery.length > 0) {
      fullQuery += `&student_id=${encodeURIComponent(authenticatedUid)}`;
    } else {
      fullQuery = `student_id=${encodeURIComponent(authenticatedUid)}`;
    }
  }

  const url = `${SERVER_URL}/${table}?${fullQuery}`;

  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resultsEl.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
          resultsEl.textContent = "Error parsing response JSON.";
        }
      } else {
        let errorMsg = "Query failed.";
        try {
          errorMsg = JSON.parse(xhr.responseText).error || errorMsg;
        } catch {}
        resultsEl.textContent = errorMsg;
      }
    }
  };
  xhr.send();
}
