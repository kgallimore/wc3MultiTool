import { Module } from "../moduleBase";

import { GameSocketEvents, GameList } from "./../globals/gameSocket";
import { Regions } from "wc3mt-lobby-container";

export interface OpenLobbyParams {
  lobbyName?: string;
  gameId?: number;
  mapFile?: string;
  region?: Regions;
}

class ProtocolHandler extends Module {
  openLobbyParams: OpenLobbyParams = {};
  constructor() {
    super();
  }
  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.GameList) {
      if (
        this.openLobbyParams &&
        (this.openLobbyParams.lobbyName || this.openLobbyParams.gameId)
      ) {
        this.info("GameList received, trying to find lobby.");
        this.handleGameList(events.GameList);
      }
    }
  }

  async processURL(url: string) {
    if (url) {
      this.openLobbyParams = this.getQueryVariables(url.split("?", 2)[1]);
      if (this.openLobbyParams.lobbyName || this.openLobbyParams.gameId) {
        this.info(this.openLobbyParams);
        if (await this.warControl.isWarcraftOpen()) {
          if (
            this.openLobbyParams.region &&
            this.openLobbyParams.region !== this.gameState.values.selfRegion
          ) {
            this.info(`Changing region to ${this.openLobbyParams.region}`);
            await this.warControl.exitGame();
            this.warControl.openWarcraft(this.openLobbyParams.region);
          } else {
            this.openParamsJoin();
          }
        } else {
          this.info(
            "Warcraft is not open, opening. " + this.openLobbyParams.region
              ? this.openLobbyParams.region
              : ""
          );
          try {
            await this.warControl.openWarcraft(this.openLobbyParams.region);
          } catch (e) {
            this.warn(e);
          }
        }
      }
    }
  }

  async openParamsJoin() {
    // TODO: make this more robust
    if (
      this.openLobbyParams.lobbyName ||
      (this.openLobbyParams.gameId && this.openLobbyParams.mapFile)
    ) {
      this.info("Setting autoHost to off to join a lobby link.");
      this.settings.updateSettings({ autoHost: { type: "off" } });
      if (
        (this.openLobbyParams.region &&
          this.openLobbyParams.region !== this.gameState.values.selfRegion) ||
        this.gameState.values.menuState === "LOADING_SCREEN"
      ) {
        this.info(
          `Changing region to match lobby of region ${this.openLobbyParams.region}`
        );
        await this.warControl.exitGame();
        this.warControl.openWarcraft(this.openLobbyParams.region);
        return;
      }
      if (this.gameState.values.inGame || this.lobby?.microLobby?.lookupName) {
        this.warControl.leaveGame();
        return;
      }
      if (this.openLobbyParams.lobbyName) {
        this.gameSocket.sendMessage({ SendGameListing: {} });
        setTimeout(() => {
          this.gameSocket.sendMessage({ GetGameList: {} });
        }, 500);
      } else if (this.openLobbyParams.gameId && this.openLobbyParams.mapFile) {
        this.gameSocket.sendMessage({
          JoinGame: {
            gameId: this.openLobbyParams.gameId,
            password: "",
            mapFile: this.openLobbyParams.mapFile,
          },
        });
        this.openLobbyParams = {};
      }
    }
  }

  getQueryVariables(url: string) {
    var vars = url?.split("&");
    let pairs: { [key: string]: string } = {};
    if (vars) {
      for (var i = 0; i < vars.length; i++) {
        if (vars[i]) pairs[vars[i].split("=")[0]] = decodeURI(vars[i].split("=")[1]);
      }
    }

    return pairs;
  }

  handleGameList(List: GameList) {
    if (List.games && List.games.length > 0) {
      List.games.some((game) => {
        if (
          this.openLobbyParams.lobbyName &&
          game.name === this.openLobbyParams.lobbyName
        ) {
          this.info("Found game by name");
          this.gameSocket.sendMessage({
            JoinGame: {
              gameId: game.id,
              password: "",
              mapFile: game.mapFile,
            },
          });
          return true;
        } else if (
          this.openLobbyParams.gameId &&
          game.id === this.openLobbyParams.gameId
        ) {
          this.info("Found game by Id");
          this.gameSocket.sendMessage({
            JoinGame: {
              gameId: game.id,
              password: "",
              mapFile: game.mapFile,
            },
          });
          return true;
        }
      });
      this.openLobbyParams = {};
    }
  }
}

export const protocolHandler = new ProtocolHandler();
