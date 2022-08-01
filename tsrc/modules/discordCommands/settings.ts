import { SlashCommandBuilder, Interaction, CacheType, EmbedBuilder } from "discord.js";
import type { ChatChannelMatch } from "./../discordBot";
import { settings } from "./../../globals/settings";

import { app } from "electron";
import { createWriteStream } from "fs";
import { get } from "https";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("upload")
    .setDescription("Uploads and set a new map")
    .addAttachmentOption((attachment) =>
      attachment.setName("file").setRequired(true).setDescription("The target map")
    ),
  async execute(interaction: Interaction<CacheType>, channelMatch: ChatChannelMatch) {
    if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;
    if (
      channelMatch !== "admin" &&
      !interaction.memberPermissions?.has("Administrator") &&
      !interaction.member.roles.cache.has(settings.values.discord.adminRole)
    ) {
      await interaction.reply({
        content: "You are not allowed to run this command.",
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply({ ephemeral: channelMatch !== "admin" });
    let file = interaction.options.getAttachment("file", true);
    if (file.size > 150000000) {
      await interaction.editReply({
        content: "How did you upload a map that big? Discord must have been updated.",
      });
      return;
    }
    if (!file.name) {
      await interaction.editReply({
        content: "File name required",
      });
      return;
    }
    if (!["w3x", "w3m"].includes(file.name.split(".")[file.name.split(".").length - 1])) {
      await interaction.editReply({
        content: "Please upload a .w3m or a .w3x",
      });
      return;
    }
    get(file.url, (res) => {
      // Image will be stored at this path
      const path = `${app
        .getPath("home")
        .replace(/\\/g, "/")}/Documents/Warcraft III/Maps/MultiTool/${file.name}`;
      const filePath = createWriteStream(path);
      res.pipe(filePath);
      filePath.on("finish", () => {
        filePath.close();
        console.log("Download Completed");
        interaction.editReply({
          content: "Successfully downloaded " + file.name,
        });
        settings.updateSettings({ autoHost: { mapPath: path } });
      });
    });
  },
};
