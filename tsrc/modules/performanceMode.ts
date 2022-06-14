import { ModuleBase } from "../moduleBase";

import { existsSync, renameSync } from "fs";
import Store from "electron-store";
const store = new Store();

class PerformanceMode extends ModuleBase {
  warInstallLoc: string;

  constructor() {
    super();
    this.warInstallLoc = store.get("warInstallLoc") as string;
    this.togglePerformanceMode(this.settings.values.client.performanceMode);
  }

  togglePerformanceMode(enabled: boolean) {
    if (enabled) {
      if (existsSync(this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js")) {
        renameSync(
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js",
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak"
        );
      }
    } else {
      if (
        existsSync(this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak")
      ) {
        renameSync(
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js.bak",
          this.warInstallLoc + "\\_retail_\\webui\\GlueManagerAltered.js"
        );
      }
    }
  }
}

export const performanceMode = new PerformanceMode();
