import { ModuleBase } from "../moduleBase";

import type { SettingsUpdates } from "../globals/settings";

import Discord from "discord.js";
import type { mmdResults } from "./replayHandler";
import type { PlayerTeamsData } from "wc3mt-lobby-container";
import type { LobbyUpdatesExtended } from "./lobbyControl";
import { DeColorName } from "../utility";
import { app } from "electron";
import { GameState } from "../globals/gameState";
import { GameSocketEvents } from "../globals/gameSocket";

class DiscordBot extends ModuleBase {
  client: Discord.Client | null = null;
  announceChannel: Discord.TextChannel | null = null;
  chatChannel: Discord.TextChannel | null = null;
  adminChannel: Discord.TextChannel | null = null;
  dev: boolean;
  private _embed: Discord.MessageEmbed | null = null;
  private _sentEmbed: Discord.Message | null = null;
  private _sentEmbedData: PlayerTeamsData | null = null;
  private _lobbyState: {
    status: "started" | "closed" | "active" | "ended";
    name: string;
  } = {
    status: "closed",
    name: "",
  };
  private _lobbyUpdates: { lastUpdate: number; updateTimer: NodeJS.Timeout | null } = {
    lastUpdate: 0,
    updateTimer: null,
  };

  constructor() {
    super("Discord", {
      listeners: [
        "gameSocketEvent",
        "settingsUpdate",
        "lobbyUpdate",
        "gameStateUpdates",
        "warnings",
        "errors",
      ],
    });
    this.dev = app.isPackaged;
    this.initialize();
  }

  protected onSettingsUpdate(updates: SettingsUpdates) {
    if (updates.discord) {
      if (updates.discord.token !== undefined) {
        this.initialize();
      }
      if (
        updates.discord.announceChannel !== undefined ||
        updates.discord.chatChannel !== undefined ||
        updates.discord.adminChannel !== undefined
      ) {
        this.initialize();
      }
    }
  }

  protected onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    if (!this.settings.values.discord.enabled) {
      return;
    }
    if (updates.newLobby) {
      this.sendNewLobby();
    } else if (updates.leftLobby) {
      this.lobbyClosed();
    } else if (
      updates.lobbyReady === undefined &&
      updates.stale === undefined &&
      updates.chatMessage === undefined
    ) {
      this.updateDiscordLobby();
    }
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (!this.settings.values.discord.enabled) {
      return;
    }
    if (updates.menuState === "LOADING_SCREEN") {
      this.lobbyStarted();
    }
    if (updates.inGame === false) {
      this.lobbyEnded(null);
    }
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (!this.settings.values.discord.enabled) {
      return;
    }
    if (
      events.disconnected ||
      (events.MultiplayerGameLeave &&
        this.gameState.values.menuState !== "LOADING_SCREEN")
    ) {
      this.lobbyClosed();
    }
    if (events.processedChat && this.chatChannel) {
      this.sendMessage(
        events.processedChat.sender + ": " + events.processedChat.translated
          ? events.processedChat.translated + "||" + events.processedChat.content + "||"
          : events.processedChat.content,
        "chat"
      );
    }
  }

  private initialize() {
    this.client?.destroy();
    this.client = null;
    if (!this.settings.values.discord.token) {
      return;
    }
    this.client = new Discord.Client({
      intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS],
    });
    this.client.on("ready", () => {
      if (!this.client?.user) {
        this.error("Missing client user.");
        return;
      }
      this.client.user.setStatus("online");
      this.client.user.setUsername("WC3 MultiTool");
      if (!this.dev) {
        this.client.user.setAvatar("./images/wc3_auto_balancer_v2.png");
      }
      this.verbose(`Logged in as ${this.client.user.tag}!`);
      this.client.user.setActivity({
        name: "war.trenchguns.com",
        type: "WATCHING",
      });
      this.getChannels();
    });

    this.client.on("message", (msg) => {
      // TODO: admin commands
      if (msg.channel === this.chatChannel && !msg.author.bot) {
        if (this.settings.values.discord.bidirectionalChat) {
          this.gameSocket.sendChatMessage(
            "(DC)" + msg.author.username + ": " + msg.content
          );
        }
      }
    });
    this.client.login(this.settings.values.discord.token);
  }

  private getChannels() {
    if (!this.client) {
      this.error("Tried to get channels before client is available.");
      return;
    }
    // Flush channels just in case the new ones don't exist or the channels aren't wanted.
    this.chatChannel = null;
    this.announceChannel = null;
    this.adminChannel = null;
    if (
      this.settings.values.discord.chatChannel ||
      this.settings.values.discord.announceChannel ||
      this.settings.values.discord.adminChannel
    ) {
      this.client.channels.cache
        .filter((channel) => channel.isText())
        .forEach((channel) => {
          if (
            (this.settings.values.discord.announceChannel &&
              (channel as Discord.TextChannel).name ===
                this.settings.values.discord.announceChannel) ||
            channel.id === this.settings.values.discord.announceChannel
          ) {
            this.announceChannel = channel as Discord.TextChannel;
          }
          if (
            (this.settings.values.discord.chatChannel &&
              (channel as Discord.TextChannel).name ===
                this.settings.values.discord.chatChannel) ||
            channel.id === this.settings.values.discord.chatChannel
          ) {
            this.chatChannel = channel as Discord.TextChannel;
          }
          if (
            (this.settings.values.discord.adminChannel &&
              (channel as Discord.TextChannel).name ===
                this.settings.values.discord.adminChannel) ||
            channel.id === this.settings.values.discord.adminChannel
          ) {
            this.adminChannel = channel as Discord.TextChannel;
          }
        });
      if (this.settings.values.discord.chatChannel && !this.chatChannel) {
        this.warn("Chat channel set, but could not be found.");
      }
      if (this.settings.values.discord.announceChannel && !this.announceChannel) {
        this.warn("Announce channel set, but could not be found.");
      }
      if (this.settings.values.discord.adminChannel && !this.adminChannel) {
        this.warn("Admin channel set, but could not be found.");
      }
    } else {
      this.verbose("No channels set.");
    }
  }

  // TODO: Reimplement with new lobby updates

  private async sendNewLobby() {
    if (this._embed && this._sentEmbed) {
      await this.lobbyClosed();
    }
    if (!this.lobby?.microLobby) {
      return;
    }
    let lobbyData = this.lobby.microLobby.exportMin();
    let data = this.lobby.microLobby.exportTeamStructure();
    this._embed = new Discord.MessageEmbed()
      .setTitle(
        (lobbyData.region === "us" ? ":flag_us: " : ":flag_eu: ") +
          lobbyData.lobbyStatic.lobbyName
      )
      .setColor("#0099ff")
      .setDescription("Click above to launch WC3MT and join the lobby")
      .setURL(
        `https://${this.dev ? "dev" : "war"}.trenchguns.com/?lobbyName=${encodeURI(
          lobbyData.lobbyStatic.lobbyName
        )}`
      )
      .addFields([
        { name: "Map Name", value: DeColorName(lobbyData.lobbyStatic.mapData.mapName) },
        { name: "Created", value: `<t:${Math.floor(Date.now() / 1000)}:R> ` },
        {
          name: "Observers",
          value: lobbyData.lobbyStatic.mapFlags.typeObservers !== 0 ? "Yes" : "No",
          inline: true,
        },
      ]);
    if (data) {
    }
    Object.entries(data).forEach(([teamName, data]) => {
      let combinedData = data.map(
        (data) =>
          data.name +
          (data.data.extra && data.data.extra.rating > -1
            ? ": " +
              [
                data.data.extra.rating,
                data.data.extra.rank,
                data.data.extra.wins,
                data.data.extra.losses,
              ].join("/")
            : "") +
          (data.realPlayer ? `\n<t:${Math.floor(data.data.joinedAt / 1000)}:R>` : "")
      );
      this._embed?.addFields([{ name: teamName, value: combinedData.join("\n") ?? "" }]);
    });
    this.client?.user?.setActivity({
      name: "Warcraft III - " + lobbyData.lobbyStatic.lobbyName,
      type: "PLAYING",
    });
    this._lobbyState.status = "active";
    this._lobbyState.name = lobbyData.lobbyStatic.lobbyName;
    this._sentEmbed = await this.sendMessage({ embeds: [this._embed] }, "announce");
  }

  private async lobbyStarted() {
    if (this._embed && this._sentEmbed && this._lobbyState.status === "active") {
      let newEmbed = new Discord.MessageEmbed(this._embed);
      newEmbed.setDescription("Game has started");
      newEmbed.setColor("#FF3D14");
      newEmbed.setURL("");
      newEmbed.addFields([
        { name: "Game Started", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
      ]);
      this._lobbyState.status = "started";
      this._sentEmbed.edit({ embeds: [newEmbed] });
      if (this._lobbyState.name)
        this.sendMessage("Game started. End of chat for " + this._lobbyState.name);
    }
  }

  async lobbyEnded(results: mmdResults | null) {
    if (this._embed && this._sentEmbed) {
      if (this._lobbyState.status === "started") {
        let newEmbed = new Discord.MessageEmbed(this._embed);
        newEmbed.setDescription("Game has ended");
        newEmbed.setColor("#228B22");
        newEmbed.setURL("");
        if (results)
          newEmbed.fields.forEach((field) => {
            // TODO append results
            for (const [playerName, value] of Object.entries(results.list)) {
              if (field.value.match(new RegExp(playerName, "i"))) {
              }
            }
            Object.entries(results.list).some((key) => {});
          });
        newEmbed.addFields([
          { name: "Game Ended", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
        ]);
        this._sentEmbed.edit({ embeds: [newEmbed] });
      }
      this._sentEmbed = null;
      this._embed = null;
      this._lobbyState.status = "closed";
      this.client?.user?.setActivity({
        name: "war.trenchguns.com",
        type: "WATCHING",
      });
    }
  }

  async lobbyClosed() {
    if (this._embed && this._sentEmbed) {
      if (this._lobbyState.status !== "started" && this._lobbyState.status !== "closed") {
        let newEmbed = new Discord.MessageEmbed(this._embed);
        newEmbed.setDescription("Lobby closed");
        newEmbed.setColor("#36454F");
        newEmbed.setURL("");
        newEmbed.fields = this._embed.fields.splice(0, 3);
        this._embed = newEmbed;
        newEmbed.addFields([
          { name: "Lobby Closed", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
        ]);
        this._sentEmbed.edit({ embeds: [newEmbed] });
        if (this._lobbyState.name)
          this.sendMessage("Lobby left. End of chat for " + this._lobbyState.name);
      }
      this._sentEmbed = null;
      this._embed = null;
      this._lobbyState.status = "closed";
      this.client?.user?.setActivity({
        name: "war.trenchguns.com",
        type: "WATCHING",
      });
    }
  }

  private async updateDiscordLobby() {
    if (this._embed && this._sentEmbed && this._lobbyState.status === "active") {
      if (!this.lobby?.microLobby) {
        return;
      }
      let data = this.lobby.microLobby.exportTeamStructure();
      if (data === this._sentEmbedData) {
        return;
      }
      let now = Date.now();
      if (now - this._lobbyUpdates.lastUpdate > 1000) {
        if (this._lobbyUpdates.updateTimer) {
          clearTimeout(this._lobbyUpdates.updateTimer);
          this._lobbyUpdates.updateTimer = null;
        }
        this._lobbyUpdates.lastUpdate = now;
        let newEmbed = new Discord.MessageEmbed(this._embed);
        newEmbed.fields = this._embed.fields.splice(0, 3);
        this._embed = newEmbed;
        Object.entries(data).forEach(([teamName, data]) => {
          let combinedData = data.map(
            (data) =>
              data.name +
              (data.data.extra && data.data.extra.rating > -1
                ? ": " +
                  [
                    "Rating: " + data.data.extra.rating,
                    "Rank: " + data.data.extra.rank,
                    "Wins: " + data.data.extra.wins,
                    "Losses: " + data.data.extra.losses,
                  ].join("/")
                : "") +
              (data.realPlayer ? `\n<t:${Math.floor(data.data.joinedAt / 1000)}:R>` : "")
          );
          newEmbed.addFields([{ name: teamName, value: combinedData.join("\n") ?? "" }]);
        });
        this._sentEmbed.edit({ embeds: [newEmbed] });
      } else {
        // Debounce
        if (!this._lobbyUpdates.updateTimer) {
          this._lobbyUpdates.updateTimer = setTimeout(
            this.updateDiscordLobby.bind(this),
            this._lobbyUpdates.lastUpdate + 1000 - now
          );
        }
      }
    }
  }

  protected onErrorLog(name: string, ...events: any[]): void {
    if (
      (this.settings.values.discord.logLevel === "error" ||
        this.settings.values.discord.logLevel === "warn") &&
      this.adminChannel
    ) {
      this.sendMessage(name + " ERROR: " + JSON.stringify(events), "admin");
    }
  }

  protected onWarnLog(name: string, ...events: any[]): void {
    if (this.settings.values.discord.logLevel === "warn" && this.adminChannel) {
      this.sendMessage(name + " WARN: " + JSON.stringify(events), "admin");
    }
  }

  async sendMessage(
    message: string | Discord.MessagePayload | Discord.MessageOptions,
    channel: "chat" | "announce" | "admin" = "chat"
  ) {
    if (channel === "chat" && this.chatChannel) {
      return this.chatChannel.send(message);
    } else if (channel === "announce" && this.announceChannel) {
      return this.announceChannel.send(message);
    } else if (channel === "admin" && this.adminChannel) {
      return this.adminChannel.send(message);
    } else {
      console.log("Channel is not defined");
      return null;
    }
  }
}

export const discordBot = new DiscordBot();
