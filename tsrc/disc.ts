import Discord from "discord.js";
import EventEmitter from "events";
import type { mmdResults } from "./utility";
export class DisClient extends EventEmitter {
  client: Discord.Client;
  announceChannel: Discord.TextChannel | null;
  chatChannel: Discord.TextChannel | null;
  dev: boolean;
  #embed: Discord.MessageEmbed | null;
  #sentEmbed: Discord.Message | null;
  bidirectionalChat: boolean;
  _events: { [key: string]: any };
  constructor(
    token: string,
    announceChannel: string,
    chatChannel: string,
    bidirectionalChat = true,
    dev = false
  ) {
    super();
    this.dev = dev;
    this.#embed = null;
    this.#sentEmbed = null;
    this.bidirectionalChat = bidirectionalChat;
    if (!token) {
      throw new Error("Token is empty");
    }
    if (!announceChannel) {
      throw new Error("Channel is empty");
    }
    this.client = new Discord.Client();
    this.announceChannel = null;
    this.chatChannel = null;
    this._events = {};
    this.client.on("ready", () => {
      this.client.user?.setActivity("Warcraft III", { type: "WATCHING" });
      this.client.user?.setStatus("online");
      this.client.user?.setUsername("WC3 MultiTool");
      console.log(`Logged in as ${this.client?.user?.tag}!`);
      this.client.channels.cache.forEach((channel) => {
        if (channel.isText()) {
          if (
            (channel as Discord.TextChannel).name === announceChannel ||
            channel.id === announceChannel
          ) {
            this.announceChannel = channel as Discord.TextChannel;
          }
          if (
            (chatChannel && (channel as Discord.TextChannel).name === chatChannel) ||
            channel.id === chatChannel
          ) {
            this.chatChannel = channel as Discord.TextChannel;
          }
        }
      });
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

  async sendNewLobby(
    region: "us" | "eu",
    lobby: string,
    mapName: string,
    priv: boolean,
    observers: boolean
  ) {
    this.#embed = new Discord.MessageEmbed()
      .setTitle((region === "us" ? ":flag_us: " : ":flag_eu: ") + lobby)
      .setColor("#0099ff")
      .setDescription("Click above to launch WC3MT and join the lobby")
      .setURL(
        `https://${this.dev ? "dev" : "war"}.trenchguns.com/?lobbyName=${encodeURI(
          lobby
        )}`
      )
      .addFields([
        { name: "Map Name", value: mapName },
        { name: "Created", value: `<t:${Math.floor(Date.now() / 1000)}:R> ` },
        { name: "Private", value: priv ? "Yes" : "No", inline: true },
        { name: "Observers", value: observers ? "Yes" : "No", inline: true },
      ]);

    this.#sentEmbed = await this.sendMessage(this.#embed, this.announceChannel);
  }

  async lobbyStarted() {
    if (this.#embed && this.#sentEmbed) {
      let newEmbed = new Discord.MessageEmbed(this.#embed);
      newEmbed.setDescription("Game has started");
      newEmbed.setColor("#FF3D14");
      newEmbed.setURL("");
      newEmbed.addFields([
        { name: "Game Started", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
      ]);
      this.#sentEmbed.edit(newEmbed);
    }
  }

  async lobbyEnded(results: mmdResults) {
    if (this.#embed && this.#sentEmbed) {
      let newEmbed = new Discord.MessageEmbed(this.#embed);
      newEmbed.setDescription("Game has ended");
      newEmbed.setColor("#228B22");
      newEmbed.setURL("");
      newEmbed.fields.forEach((field) => {
        for (const [playerName, value] of Object.entries(results.list)) {
          if (field.value.match(new RegExp(playerName, "i"))) {
          }
        }
        Object.entries(results.list).some((key) => {});
      });
      newEmbed.addFields([
        { name: "Game Ended", value: `<t:${Math.floor(Date.now() / 1000)}:R>` },
      ]);
      this.#sentEmbed.edit(newEmbed);
    }
  }

  async updateLobby(data: { [key: string]: Array<string> }) {
    if (this.#embed && this.#sentEmbed) {
      let newEmbed = new Discord.MessageEmbed(this.#embed);
      newEmbed.fields = this.#embed.fields.splice(0, 4);
      this.#embed = newEmbed;
      Object.entries(data).forEach(([teamName, name]) => {
        newEmbed.addFields([{ name: teamName, value: name.join("\n") || "" }]);
      });
      this.#sentEmbed.edit(newEmbed);
    }
  }

  async sendMessage(message: string | Discord.MessageEmbed, channel = this.chatChannel) {
    if (channel) {
      return channel.send(message);
    } else {
      console.log("Channel is not defined");
      return null;
    }
  }
}
