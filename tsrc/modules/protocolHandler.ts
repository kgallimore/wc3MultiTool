import { ModuleBase } from "../moduleBase";

import type { GameSocketEvents, GameList } from "./../globals/gameSocket";

class ProtocolHandler extends ModuleBase {
  constructor() {
    super({ listeners: ["gameSocketEvent"] });
  }
  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.connected) {
      if (this.gameState.values.openLobbyParams.lobbyName) {
        this.openParamsJoin();
      }
    }
    if (events.SetGlueScreen) {
      if (["CUSTOM_LOBBIES", "MAIN_MENU"].includes(events.SetGlueScreen.screen)) {
        this.info("Checking to see if we should auto host or join a lobby link.");
        if (this.gameState.values.openLobbyParams.lobbyName) {
          setTimeout(protocolHandler.openParamsJoin, 250);
        }
      }
    }
    if (
      events.GameList &&
      (this.gameState.values.openLobbyParams.lobbyName ||
        this.gameState.values.openLobbyParams.gameId)
    ) {
      this.info("GameList received, trying to find lobby.");
      this.handleGameList(events.GameList);
    }
  }

  async processURL(url: string) {
    if (url) {
      this.gameState.values.openLobbyParams = this.getQueryVariables(
        url.split("?", 2)[1]
      );
      if (
        this.gameState.values.openLobbyParams.lobbyName ||
        this.gameState.values.openLobbyParams.gameId
      ) {
        this.info(this.gameState.values.openLobbyParams);
        if (await this.warControl.isWarcraftOpen()) {
          if (
            this.gameState.values.openLobbyParams.region &&
            this.gameState.values.openLobbyParams.region !==
              this.gameState.values.selfRegion
          ) {
            this.info(
              `Changing region to ${this.gameState.values.openLobbyParams.region}`
            );
            await this.warControl.exitGame();
            this.warControl.openWarcraft(this.gameState.values.openLobbyParams.region);
          } else {
            this.openParamsJoin();
          }
        } else {
          this.info(
            "Warcraft is not open, opening. " +
              this.gameState.values.openLobbyParams.region
              ? this.gameState.values.openLobbyParams.region
              : ""
          );
          try {
            await this.warControl.openWarcraft(
              this.gameState.values.openLobbyParams.region
            );
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
      this.gameState.values.openLobbyParams.lobbyName ||
      (this.gameState.values.openLobbyParams.gameId &&
        this.gameState.values.openLobbyParams.mapFile)
    ) {
      this.info("Setting autoHost to off to join a lobby link.");
      this.settings.updateSettings({ autoHost: { type: "off" } });
      if (
        (this.gameState.values.openLobbyParams.region &&
          this.gameState.values.openLobbyParams.region !==
            this.gameState.values.selfRegion) ||
        this.gameState.values.menuState === "LOADING_SCREEN"
      ) {
        this.info(
          `Changing region to match lobby of region ${this.gameState.values.openLobbyParams.region}`
        );
        await this.warControl.exitGame();
        this.warControl.openWarcraft(this.gameState.values.openLobbyParams.region);
        return;
      }
      if (this.gameState.values.inGame || this.lobby?.microLobby?.lookupName) {
        this.lobby?.leaveGame();
        return;
      }
      if (this.gameState.values.openLobbyParams.lobbyName) {
        this.gameSocket.sendMessage({ SendGameListing: {} });
        setTimeout(() => {
          this.gameSocket.sendMessage({ GetGameList: {} });
        }, 500);
      } else if (
        this.gameState.values.openLobbyParams.gameId &&
        this.gameState.values.openLobbyParams.mapFile
      ) {
        this.gameSocket.sendMessage({
          JoinGame: {
            gameId: this.gameState.values.openLobbyParams.gameId,
            password: "",
            mapFile: this.gameState.values.openLobbyParams.mapFile,
          },
        });
        this.gameState.values.openLobbyParams = {};
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
          this.gameState.values.openLobbyParams.lobbyName &&
          game.name === this.gameState.values.openLobbyParams.lobbyName
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
          this.gameState.values.openLobbyParams.gameId &&
          game.id === this.gameState.values.openLobbyParams.gameId
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
      this.gameState.values.openLobbyParams = {};
    }
  }
}

export const protocolHandler = new ProtocolHandler();
