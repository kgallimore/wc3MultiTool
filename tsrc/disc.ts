import Discord from "discord.js";

export class DisClient {
  client: Discord.Client;
  channel: Discord.TextChannel | null;
  dev: boolean;
  constructor(token: string, botChannel: string, dev = false) {
    this.dev = dev;
    if (token === "") {
      throw new Error("Token is empty");
    }
    if (botChannel === "") {
      throw new Error("Channel is empty");
    }
    this.client = new Discord.Client();
    this.channel = null;
    this.client.on("ready", () => {
      console.log(`Logged in as ${this.client?.user?.tag}!`);
      this.client.channels.cache.forEach((channel) => {
        if (
          (channel.isText() && (channel as Discord.TextChannel).name === botChannel) ||
          channel.id === botChannel
        ) {
          this.channel = channel as Discord.TextChannel;
          return true;
        }
      });
    });

    this.client.on("message", (msg) => {
      if (msg.content === "ping") {
        msg.reply("pong");
      }
    });

    this.client.login(token);
  }
  sendNewLobby(lobby: string) {
    let embedData = {};
    if (this.dev) {
      embedData = {
        title: "New lobby",
        url: "https://dev.trenchguns.com/?lobbyName=" + encodeURI(lobby),
      };
    } else {
      embedData = {
        title: "New lobby",
        url: "https://war.trenchguns.com/?lobbyName=" + encodeURI(lobby),
      };
    }

    this.sendMessage({ embed: embedData });
  }
  sendMessage(message: string | object) {
    if (this.channel) {
      this.channel.send(message);
    }
  }
}
