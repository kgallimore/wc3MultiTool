import { Module } from "../moduleBase";
import type { MicroLobbyData } from "wc3mt-lobby-container";

import { settings } from "./../globals/settings";

import Discord from "discord.js";
import type { mmdResults } from "../utility";
import type { PlayerTeamsData } from "wc3mt-lobby-container";
import { DeColorName } from "../utility";

class DisClient extends Module {
  client: Discord.Client;
  announceChannel: Discord.TextChannel | null = null;
  chatChannel: Discord.TextChannel | null = null;
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
  private _lobbyUpdates: { lastUpdate: number; update: PlayerTeamsData | null } = {
    lastUpdate: 0,
    update: null,
  };

  constructor(dev: boolean = false) {
    super();
    this.dev = dev;
    if (!settings.values.discord.token) {
      throw new Error("Token is empty");
    }
    this.client = new Discord.Client({
      intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS],
    });
    this.client.on("ready", () => {
      if (this.client.user) {
        this.client.user.setStatus("online");
        this.client.user.setUsername("WC3 MultiTool");
        if (!dev) {
          this.client.user.setAvatar("./images/wc3_auto_balancer_v2.png");
        }
        console.log(`Logged in as ${this.client.user.tag}!`);
        this.client?.user?.setActivity({
          name: "war.trenchguns.com",
          type: "WATCHING",
        });
        if (
          settings.values.discord.chatChannel ||
          settings.values.discord.announceChannel
        ) {
          this.client.channels.cache
            .filter((channel) => channel.isText())
            .forEach((channel) => {
              if (
                (settings.values.discord.announceChannel &&
                  (channel as Discord.TextChannel).name ===
                    settings.values.discord.announceChannel) ||
                channel.id === settings.values.discord.announceChannel
              ) {
                this.announceChannel = channel as Discord.TextChannel;
              }
              if (
                (settings.values.discord.chatChannel &&
                  settings.values.discord.chatChannel &&
                  (channel as Discord.TextChannel).name ===
                    settings.values.discord.chatChannel) ||
                channel.id === settings.values.discord.chatChannel
              ) {
                this.chatChannel = channel as Discord.TextChannel;
              }
            });
        }
      } else {
        console.error("Client is not ready?");
      }
    });

    this.client.on("message", (msg) => {
      if (msg.channel === this.chatChannel && !msg.author.bot) {
        if (settings.values.discord.bidirectionalChat) {
          this.sendGameChat("(DC)" + msg.author.username + ": " + msg.content);
        }
      }
    });

    this.client.login(settings.values.discord.token);
  }

  updateChannel(channelName: string, channelType: "announceChannel" | "chatChannel") {
    if (!channelName) {
      if (channelType === "announceChannel") {
        this.announceChannel = null;
      } else if (channelType === "chatChannel") {
        this.chatChannel = null;
      }
    } else {
      this.client.channels.cache.forEach((channel) => {
        if (channel.isText()) {
          if (
            (channel as Discord.TextChannel).name === channelName ||
            channel.id === channelName
          ) {
            if (channelType === "announceChannel") {
              this.announceChannel = channel as Discord.TextChannel;
            } else if (channelType === "chatChannel") {
              this.chatChannel = channel as Discord.TextChannel;
            }
          }
        }
      });
    }
  }

  async sendNewLobby(lobbyData: MicroLobbyData, data: PlayerTeamsData) {
    if (this._embed && this._sentEmbed) {
      await this.lobbyClosed();
    }
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
    this._sentEmbed = await this.sendMessage(
      { embeds: [this._embed] },
      this.announceChannel
    );
  }

  async lobbyStarted() {
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

  async lobbyEnded(results: mmdResults) {
    if (this._embed && this._sentEmbed) {
      if (this._lobbyState.status === "started") {
        let newEmbed = new Discord.MessageEmbed(this._embed);
        newEmbed.setDescription("Game has ended");
        newEmbed.setColor("#228B22");
        newEmbed.setURL("");
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

  async updateDiscordLobby(data: PlayerTeamsData | false) {
    if (this._embed && this._sentEmbed && this._lobbyState.status === "active") {
      if (data === this._sentEmbedData) {
        return;
      }
      let now = Date.now();
      if (now - this._lobbyUpdates.lastUpdate > 1000) {
        this._lobbyUpdates.lastUpdate = now;
        let newEmbed = new Discord.MessageEmbed(this._embed);
        newEmbed.fields = this._embed.fields.splice(0, 3);
        this._embed = newEmbed;
        if (!data) {
          if (this._lobbyUpdates.update) {
            data = this._lobbyUpdates.update;
          } else {
            console.error("No data to update lobby with");
            return;
          }
        }
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
        if (data) {
          this._lobbyUpdates.update = data;
        }
        setTimeout(() => {
          this.updateDiscordLobby(false);
        }, now - this._lobbyUpdates.lastUpdate);
      }
    }
  }

  async sendMessage(
    message: string | Discord.MessagePayload | Discord.MessageOptions,
    channel = this.chatChannel
  ) {
    if (channel) {
      return channel.send(message);
    } else {
      console.log("Channel is not defined");
      return null;
    }
  }
}

export const discSingle = new DisClient();
