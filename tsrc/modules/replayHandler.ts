import { ModuleBase } from "./../moduleBase";

import { app } from "electron";
import Store from "electron-store";
const store = new Store();
const FormData = require("form-data");
import parser from "w3gjs";
import { readFileSync, readdirSync, existsSync, statSync, createReadStream } from "fs";
import type { GameState } from "./../globals/gameState";
import { join } from "path";
import fetch from "cross-fetch";

export interface mmdResults {
  list: {
    [key: string]: { pid: string; won: boolean; extra: { [key: string]: string } };
  };
  lookup: { [key: string]: string };
}

class ReplayHandler extends ModuleBase {
  replayFolders = join(app.getPath("documents"), "Warcraft III\\BattleNet");

  constructor() {
    super("Replay Handler", { listeners: ["gameStateUpdates"] });
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (updates.inGame === false && this.settings.values.elo.handleReplays) {
      let mostModified = { file: "", mtime: 0 };
      readdirSync(this.replayFolders, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .forEach((folder) => {
          const targetFile = join(
            this.replayFolders,
            folder,
            "Replays",
            "LastReplay.w3g"
          );
          if (existsSync(targetFile)) {
            const stats = statSync(targetFile);
            if (stats.mtimeMs > mostModified.mtime) {
              mostModified.mtime = stats.mtimeMs;
              mostModified.file = targetFile;
            }
          }
        });
      if (
        mostModified.file &&
        mostModified.mtime > this.clientState.values.latestUploadedReplay
      ) {
        this.analyzeGame(mostModified.file).then((mmdResults) => {
          this.emitEvent({ mmdResults });
        });
        this.clientState.updateClientState({
          latestUploadedReplay: mostModified.mtime,
        });
        store.set("latestUploadedReplay", this.clientState.values.latestUploadedReplay);
        if (this.settings.values.elo.type === "wc3stats") {
          let form = new FormData();
          form.append("replay", createReadStream(mostModified.file));
          fetch(
            `https://api.wc3stats.com/upload${
              this.settings.values.elo.privateKey
                ? "/" + this.settings.values.elo.privateKey
                : ""
            }?auto=true`,
            {
              method: "POST",
              body: form,
              headers: {
                ...form.getHeaders(),
              },
            }
          ).then(
            (response) => {
              if (response.status !== 200) {
                this.info(response.statusText);
                this.sendWindow({
                  legacy: {
                    messageType: "error",
                    data: { error: response.statusText },
                  },
                });
              } else {
                this.info("Uploaded replay to wc3stats");
                this.clientState.updateClientState({
                  currentStep: "Uploaded replay",
                  currentStepProgress: 0,
                });
              }
            },
            (error) => {
              this.info(error.message);
              this.sendWindow({
                legacy: { messageType: "error", data: { error: error.message } },
              });
            }
          );
        }
      }
    }
  }

  async analyzeGame(file: string) {
    let data = new Set();
    let dataTypes = new Set();
    let parse = new parser();
    let results: mmdResults = { list: {}, lookup: {} };
    parse.on("gamedatablock", (block) => {
      if (block.id === 0x1f) {
        block.commandBlocks.forEach((commandBlock) => {
          if (
            commandBlock.actions.length > 0 &&
            // @ts-ignore
            commandBlock.actions[0].filename === "MMD.Dat"
          ) {
            commandBlock.actions.forEach((block) => {
              // @ts-ignore
              let key = block.key as string;
              if (key && !/^\d+$/.test(key)) {
                if (!/^DefVarP/i.test(key)) {
                  if (key.match(/^init pid/i)) {
                    results.list[key.split(" ")[3]] = {
                      pid: key.split(" ")[2],
                      won: false,
                      extra: {},
                    };
                    results.lookup[key.split(" ")[2]] = key.split(" ")[3];
                  } else if (key.match(/^FlagP/i)) {
                    results.list[results.lookup[key.split(" ")[1]]].won =
                      key.split(" ")[2] === "winner";
                  } else if (key.match(/^VarP /i)) {
                    if (results.list[results.lookup[key.split(" ")[1]]]) {
                      results.list[results.lookup[key.split(" ")[1]]].extra[
                        key.split(" ")[2]
                      ] = key.split("=")[1].trim();
                    }
                  }
                  data.add(key);
                } else {
                  dataTypes.add(key);
                }
              }
            });
          }
        });
      }
    });
    await parse.parse(readFileSync(file));
    return results;
  }
}

export const replayHandler = new ReplayHandler();
