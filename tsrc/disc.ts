import Discord from "discord.js";
import EventEmitter from "events";
import type { mmdResults } from "./utility";
import type { PlayerTeamsData, MicroLobbyData } from "wc3mt-lobby-container";
import { DeColorName } from "./utility";
export class DisClient extends EventEmitter {
  client: Discord.Client;
  announceChannel: Discord.TextChannel | null = null;
  chatChannel: Discord.TextChannel | null = null;
  dev: boolean;
  #embed: Discord.MessageEmbed | null = null;
  #sentEmbed: Discord.Message | null = null;
  #sentEmbedData: PlayerTeamsData | null = null;
  #lobbyState: { status: "started" | "closed" | "active" | "ended"; name: string } = {
    status: "closed",
    name: "",
  };
  #lobbyUpdates: { lastUpdate: number; update: PlayerTeamsData | null } = {
    lastUpdate: 0,
    update: null,
  };
  bidirectionalChat: boolean;
  _events: { [key: string]: any } = {};
  constructor(
    token: string,
    announceChannel: string,
    chatChannel: string,
    bidirectionalChat = true,
    dev = false
  ) {
    super();
    this.dev = dev;
    this.bidirectionalChat = bidirectionalChat;
    if (!token) {
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
        if (chatChannel || announceChannel) {
          this.client.channels.cache
            .filter((channel) => channel.isText())
            .forEach((channel) => {
              if (
                (announceChannel &&
                  (channel as Discord.TextChannel).name === announceChannel) ||
                channel.id === announceChannel
              ) {
                this.announceChannel = channel as Discord.TextChannel;
              }
              if (
                (chatChannel &&
                  chatChannel &&
                  (channel as Discord.TextChannel).name === chatChannel) ||
                channel.id === chatChannel
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
        if (this.bidirectionalChat) {
          this.emit("chatMessage", msg.author.username, msg.content);
        }
      }
    });

    this.client.login(token);
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
    if (this.#embed && this.#sentEmbed) {
      await this.lobbyClosed();
    }
    this.#embed = new Discord.MessageEmbed()
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
            : "")
      );
      this.#embed?.addFields([{ name: teamName, value: combinedData.join("\n") ?? "" }]);
    });
    /*this.client?.user?.setActivity("Warcraft III", {
      name: lobbyData.lobbyStatic.lobbyName,
      type: "PLAYING",
      url: "https://war.trenchguns.com",
    });*/
    this.client?.user?.setActivity({
      name: "Warcraft III - " + lobbyData.lobbyStatic.lobbyName,
      type: "PLAYING",
    });
    this.#lobbyState.status = "active";
    this.#lobbyState.name = lobbyData.lobbyStatic.lobbyName;
    this.#sentEmbed = await this.sendMessage(
      { embeds: [this.#embed] },
      this.announceChannel
    );
  }

  async lobbyStarted() {
    if (this.#embed && this.#sentEmbed && this.#lobbyState.status === "active") {
      let newEmbed = new Discord.MessageEmbed(this.#embed);
      newEmbed.setDescription("Game has started");
      newEmbed.setColor("#FF3D14");
      newEmbed.setURL("");
      newEmbed.addFields([
        { name: "Game Started", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
      ]);
      this.#lobbyState.status = "started";
      this.#sentEmbed.edit({ embeds: [newEmbed] });
      if (this.#lobbyState.name)
        this.sendMessage("Game started. End of chat for " + this.#lobbyState.name);
    }
  }

  async lobbyEnded(results: mmdResults) {
    if (this.#embed && this.#sentEmbed) {
      if (this.#lobbyState.status === "started") {
        let newEmbed = new Discord.MessageEmbed(this.#embed);
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
        this.#sentEmbed.edit({ embeds: [newEmbed] });
      }
      this.#sentEmbed = null;
      this.#embed = null;
      this.#lobbyState.status = "closed";
      this.client?.user?.setActivity({
        name: "war.trenchguns.com",
        type: "WATCHING",
      });
    }
  }

  async lobbyClosed() {
    if (this.#embed && this.#sentEmbed) {
      if (this.#lobbyState.status !== "started" && this.#lobbyState.status !== "closed") {
        let newEmbed = new Discord.MessageEmbed(this.#embed);
        newEmbed.setDescription("Lobby closed");
        newEmbed.setColor("#36454F");
        newEmbed.setURL("");
        newEmbed.fields = this.#embed.fields.splice(0, 3);
        this.#embed = newEmbed;
        newEmbed.addFields([
          { name: "Lobby Closed", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
        ]);
        this.#sentEmbed.edit({ embeds: [newEmbed] });
        if (this.#lobbyState.name)
          this.sendMessage("Lobby left. End of chat for " + this.#lobbyState.name);
      }
      this.#sentEmbed = null;
      this.#embed = null;
      this.#lobbyState.status = "closed";
      this.client?.user?.setActivity({
        name: "war.trenchguns.com",
        type: "WATCHING",
      });
    }
  }

  async updateLobby(data: PlayerTeamsData | false) {
    if (this.#embed && this.#sentEmbed && this.#lobbyState.status === "active") {
      if (data === this.#sentEmbedData) {
        return;
      }
      let now = Date.now();
      if (now - this.#lobbyUpdates.lastUpdate > 1000) {
        this.#lobbyUpdates.lastUpdate = now;
        let newEmbed = new Discord.MessageEmbed(this.#embed);
        newEmbed.fields = this.#embed.fields.splice(0, 3);
        this.#embed = newEmbed;
        if (!data) {
          if (this.#lobbyUpdates.update) {
            data = this.#lobbyUpdates.update;
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
                : "")
          );
          newEmbed.addFields([{ name: teamName, value: combinedData.join("\n") ?? "" }]);
        });
        this.#sentEmbed.edit({ embeds: [newEmbed] });
      } else {
        // Debounce
        if (data) {
          this.#lobbyUpdates.update = data;
        }
        setTimeout(() => {
          this.updateLobby(false);
        }, now - this.#lobbyUpdates.lastUpdate);
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
