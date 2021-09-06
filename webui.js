let webSocket;
let autoHost = {
  type: "off",
};
let addedHtml;
const version = "1.0.0";

function wsSetup() {
  webSocket = new WebSocket("ws://127.0.0.1:8888");
  webSocket.onopen = function (event) {
    sendSocket("info", "Connected. Hello! I am version: " + version);
    if (websocketLocation !== "") {
      sendSocket("clientWebSocket", websocketLocation);
    }
    if (document.readyState !== "loading") {
      modifyPages();
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        modifyPages();
      });
    }
  };
  webSocket.onclose = function (event) {
    if (addedHtml) {
      addedHtml.remove();
      addedHtml = null;
    }
    window.setTimeout(wsSetup, 5000);
  };
  webSocket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    switch (data.messageType) {
      case "autoHostSettings":
        autoHost = data.data;
        if (addedHtml) {
          let buttonColor = document.getElementById("toggleAutoHostColor");
          buttonColor.classList.toggle("Primary-Button-Red");
          buttonColor.classList.toggle("Primary-Button-Green");
          buttonColor.querySelector(
            "div:not([class]), div[class='']"
          ).innerHTML = `Toggle Auto Host ${
            autoHost.type === "off" ? "On" : "Off"
          }`;
        }
        sendSocket("info", autoHost);
        break;
      default:
        sendSocket("echo", event.data);
        break;
    }
  };
}

function sendSocket(messageType = "info", data = "") {
  if (webSocket && webSocket.readyState === 1) {
    webSocket.send(JSON.stringify({ messageType: messageType, data: data }));
  }
}

wsSetup();

function modifyPages() {
  if (
    !addedHtml &&
    menuState !== "Out of Menus" &&
    menuState !== "Unknown" &&
    menuState !== "In Game" &&
    menuState !== "Loading Game" &&
    webSocket &&
    webSocket.readyState === 1
  ) {
    addedHtml = document.createElement("DIV");
    addedHtml.style.zoom = "1.75";
    addedHtml.innerHTML = `<div class="Primary-Back-Button" style="position:absolute; left:30%"><div class="Primary-Button-Frame-Alternate-B" id="toggleAutoHostButton"><div class="Primary-Button Primary-Button-${
      autoHost.type === "off" ? "Red" : "Green"
    }" id="toggleAutoHostColor"><div class="Primary-Button-Content"><div>Toggle Auto Host ${
      autoHost.type === "off" ? "On" : "Off"
    }</div></div></div></div></div>`;
    document.getElementById("root").appendChild(addedHtml);
    document
      .getElementById("toggleAutoHostButton")
      .addEventListener("click", function (event) {
        sendSocket("toggleAutoHost");
      });
  }
}
