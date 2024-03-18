let webSocket: WebSocket;
let clientWS: WebSocket;
let autoHost = {
  type: 'off',
};
const state = {
  selfRegion: '',
  selfBattleTag: '',
  menuState: 'LOGIN_DOORS',
  screenState: '',
  inGame: false,
};
let addedHtml: HTMLElement | null;
const version = '1.2.0';

let qs: URLSearchParams;
let guid: string | null;
const currentLog: string = '';

function addLog(text: string, error: boolean = false) {
  console.log(text, error);
  /*
  if (text === currentLog) {
    return;
  }
  currentLog = text;

  if (!addedHtml) {
    addedHtml = document.createElement("DIV");
    // @ts-ignore
    addedHtml.style.zoom = "1.5";
    var root = document.getElementById("root")?.appendChild(addedHtml);
  }

  addedHtml.innerHTML = `<div class="Primary-Back-Button" style="position:absolute; left:30%"><div class="Primary-Button-Frame-Alternate-B" id="toggleAutoHostButton"><div class="Primary-Button Primary-Button-${
    error ? "Red" : "Green"
  }" id="toggleAutoHostColor"><div class="Primary-Button-Content"><div>${text}
</div></div></div></div></div>`;*/
}

setup();

function setup() {
  qs = new URLSearchParams(window.location.search);
  guid = qs.get('guid');
  wsSetup();
  clientWSSetup();
}

function clientWSSetup() {
  if (guid) {
    clientWS = new WebSocket('ws://' + location.host + '/webui-socket/' + guid);

    clientWS.onmessage = function (event) {
      const message = JSON.parse(event.data);
      const messageType = message.messageType;
      const payload = message.payload;
      if (payload && messageType) {
        if (messageType === 'SetGlueScreen') {
          if (state.menuState === 'LOADING_SCREEN' && payload.screen === 'SCORE_SCREEN') {
            state.inGame = true;
          } else {
            state.inGame = false;
          }
          state.menuState = payload.screen;
        } else if (messageType === 'UpdateUserInfo') {
          state.selfBattleTag = payload.user.battleTag;
          state.selfRegion = payload.user.userRegion;
        } else if (messageType === 'ScreenTransitionInfo') {
          state.screenState = payload.screen;
        }
      }
    };

    clientWS.onopen = function (_event) {
      sendSocket('info', 'Webui Connected!');
      clientWS.onclose = function (_event) {
        sendSocket('info', 'clientWS closed');
      };
      clientWS.onerror = function (event) {
        sendSocket('info', 'clientWS error');
        sendSocket('info', event);
      };
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clientSend(message: string) {
  if (clientWS && clientWS.readyState === 1) {
    clientWS.send(JSON.stringify({ message }));
  }
}

function wsSetup() {
  webSocket = new WebSocket('ws://127.0.0.1:8888');
  webSocket.onopen = function (_event) {
    if (webSocket.readyState !== 1) {
      return;
    }
    sendSocket('info', 'Game Client Connected. Hello! I am version: ' + version);
    addLog('WC3MT Connected');
    if (state) {
      sendSocket('state', state);
    }
    if (guid !== '') {
      sendSocket('clientWebSocket', 'ws://' + location.host + '/webui-socket/' + guid);
    } else {
      sendSocket('info', 'There was an issue in getting game socket address!');
    }
  };
  webSocket.onclose = function (_event) {
    addLog('WC3MT Closed', true);
    window.setTimeout(wsSetup, 5000);
  };
  webSocket.onerror = function (_event) {
    if (currentLog !== 'WC3MT Closed') {
      addLog('WC3MT Error', true);
    }
  };

  webSocket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    switch (data.messageType) {
      case 'autoHostSettings':
        autoHost = data.data;
        if (addedHtml) {
          const buttonColor = document.getElementById('toggleAutoHostColor');
          if (buttonColor) {
            buttonColor.classList.toggle('Primary-Button-Red');
            buttonColor.classList.toggle('Primary-Button-Green');
            const buttonClass = buttonColor.querySelector(
              "div:not([class]), div[class='']",
            );
            if (buttonClass) {
              buttonClass.innerHTML = `Toggle Auto Host ${
                autoHost.type === 'off' ? 'On' : 'Off'
              }`;
            }
          }
        }
        sendSocket('info', autoHost);
        break;
      default:
        sendSocket('echo', event.data);
        break;
    }
  };
}

function sendSocket(messageType = 'info', data: string | object = '') {
  if (webSocket) {
    if (webSocket.OPEN) {
      webSocket.send(JSON.stringify({ messageType, data }));
    } else if (webSocket.CONNECTING) {
      setTimeout(() => {
        sendSocket(messageType, data);
      }, 100);
    }
  }
}

export function modifyPages() {
  if (
    !addedHtml &&
    state.menuState &&
    state.menuState !== 'Unknown' &&
    state.menuState !== 'In Game' &&
    state.menuState !== 'LOADING_SCREEN' &&
    webSocket &&
    webSocket.readyState === 1
  ) {
    addedHtml = document.createElement('DIV');
    // TODO: Remove zoom dependency
    //@ts-expect-error This style does exist
    addedHtml.style.zoom = '1.75';
    addedHtml.innerHTML = `<div class="Primary-Back-Button" style="position:absolute; left:30%"><div class="Primary-Button-Frame-Alternate-B" id="toggleAutoHostButton"><div class="Primary-Button Primary-Button-${
      autoHost.type === 'off' ? 'Red' : 'Green'
    }" id="toggleAutoHostColor"><div class="Primary-Button-Content"><div>Toggle Auto Host ${
      autoHost.type === 'off' ? 'On' : 'Off'
    }</div></div></div></div></div>`;
    document.getElementById('root')?.appendChild(addedHtml);
    const autoHostButton = document.getElementById('toggleAutoHostButton');
    if (autoHostButton) {
      autoHostButton.addEventListener('click', function (_event) {
        sendSocket('toggleAutoHost');
      });
    }
  }
}