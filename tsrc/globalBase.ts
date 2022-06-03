import EventEmitter from "events";

import { info, error, warn } from "electron-log";

export class Global extends EventEmitter {
  protected info = info;
  protected warn = warn;
  protected error = error;
  constructor() {
    super();
  }
}
