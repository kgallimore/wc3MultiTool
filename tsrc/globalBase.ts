import EventEmitter from "events";

import { info, error, warn, verbose } from "electron-log";

import { Notification } from "electron";

export class Global extends EventEmitter {
  protected info = info;
  protected warn = warn;
  protected error = error;
  protected verbose = verbose;
  constructor() {
    super();
  }

  protected notification(title: string, body: string) {
    new Notification({ title, body });
  }
}
