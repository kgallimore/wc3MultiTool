import { app, contextBridge, ipcRenderer, shell } from "electron";
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object

contextBridge.exposeInMainWorld("api", {
  shell: (url: string) => {
    shell.openExternal(url);
  },
  send: (channel: string, data: any) => {
    // whitelist channels
    let validChannels = ["toMain"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: any) => {
    let validChannels = ["fromMain"];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
contextBridge.exposeInMainWorld("appVersion", app.getVersion());
// Log details of versions
for (const dependency of ["chrome", "node", "electron"]) {
  console.log(`${dependency}-version`, process.versions[dependency]);
}
