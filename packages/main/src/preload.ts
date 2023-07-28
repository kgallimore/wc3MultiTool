import {contextBridge, ipcRenderer, shell} from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object

contextBridge.exposeInMainWorld('api', {
  shell: (url: string) => {
    shell.openExternal(url);
  },
  send: (channel: string, data: unknown) => {
    // whitelist channels
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, func: (...args: unknown[]) => void) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
// Log details of versions
for (const dependency of ['chrome', 'node', 'electron']) {
  console.log(`${dependency}-version`, process.versions[dependency]);
}
