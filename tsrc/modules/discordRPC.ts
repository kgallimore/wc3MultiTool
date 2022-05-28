import { Module } from "../moduleBase";
import type { GameState } from "../utility";
import type { MicroLobbyData } from "wc3mt-lobby-container";

import { Client, register, Presence } from "discord-rpc";
import type { Regions } from "wc3mt-lobby-container";
import { GameStateUpdate } from "../utility";

import { settings } from "./../globals/settings";

export interface NewActivity {
  details?: string;
  state: GameState["menuState"];
  currentPlayers?: number;
  maxPlayers?: number;
  region?: Regions | "";
  inGame: boolean;
}

export class DiscordRPC extends Module {
  private clientId = "876866700644073533";
  private client: Client;
  private ready: boolean = false;
  private startTimestamp: number = 0;
  private previousActivity: NewActivity = { state: "OUT_OF_MENUS", inGame: false };

  constructor(baseModule: {
    gameState: GameState;
    identifier: string;
    lobby?: MicroLobbyData;
  }) {
    super(baseModule);
    this.client = new Client({ transport: "ipc" });
    register(this.clientId);
    this.client.on("ready", () => {
      this.ready = true;
    });

    this.client.login({ clientId: this.clientId }).catch(console.error);
  }

  updateGameState(updates: GameStateUpdate): boolean {
    let updated = super.updateGameState(updates);
    if (updated) {
      this.setActivity({
        state: this.gameState.menuState,
        details: this.lobby?.lobbyStatic.lobbyName,
        region: this.gameState.selfRegion,
        inGame: this.gameState.inGame,
        //currentPlayers: this.lobby?.nonSpecPlayers.length,
      });
    }
    return updated;
  }

  private setActivity(activity: NewActivity) {
    if (this.ready) {
      if (
        activity.state !== this.previousActivity.state ||
        activity.details !== this.previousActivity.details
      ) {
        this.previousActivity = activity;
        this.startTimestamp = Date.now();
      }
      let baseDetails: Presence = {
        startTimestamp: this.startTimestamp,
        largeImageKey: "app_icon",
        largeImageText: "WC3 Multi-Tool",
        instance: false,
        buttons: [
          {
            label: "Install WC3MT",
            url: "https://www.hiveworkshop.com/threads/wc3-multi-tool.335492/",
          },
        ],
      };
      if (activity.details) {
        if (["CUSTOM_GAME_LOBBY", "GAME_LOBBY"].includes(activity.state)) {
          baseDetails.buttons?.push({
            label: "Join Lobby",
            url:
              "wc3mt://?lobbyName=" +
              encodeURI(activity.details) +
              "&region=" +
              activity.region,
          });
          baseDetails.state = "In Lobby";
          baseDetails.details = activity.details;
          baseDetails.partySize = activity.currentPlayers;
        } else if (activity.inGame) {
          baseDetails.state = "In Game";
          baseDetails.details = activity.details;
          baseDetails.partySize = activity.currentPlayers;
        }
      } else if (activity.region && !["OUT_OF_MENUS", "null"].includes(activity.state)) {
        baseDetails.state = "In Menus";
        baseDetails.smallImageKey = activity.region;
        baseDetails.smallImageText = activity.region;
      }
      this.client.setActivity(baseDetails);
    }
  }
}
