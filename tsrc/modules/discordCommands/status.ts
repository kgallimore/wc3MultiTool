import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { ChatChannelMatch } from "./../discordBot";
import { clientState } from "./../../globals/clientState";
import { gameState } from "./../../globals/gameState";
import { checkAdminRequired } from "./../discordUtility/utility";

module.exports = {
  data: new SlashCommandBuilder().setName("state").setDescription("Get current status."),
  async execute(
    interaction: ChatInputCommandInteraction<"cached">,
    channelMatch: ChatChannelMatch
  ) {
    if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;
    if (channelMatch !== "admin" && checkAdminRequired(interaction, channelMatch)) {
      await interaction.reply({
        content: "You are not allowed to run this command.",
        ephemeral: true,
      });
      return;
    }
    let build = (Object.entries(clientState.values) as [string, any][]).map(
      ([name, value], index) => {
        if (value === "" || value.toString() === "") {
          value = "N/A";
        }
        return { name, value: JSON.stringify(value), inline: index % 2 === 0 };
      }
    );
    let embed = new EmbedBuilder()
      .setTitle("Client State")
      .addFields(build)
      .setTimestamp();
    build = (Object.entries(gameState.values) as [string, string][]).map(
      ([name, value], index) => {
        if (value === "" || value.toString() === "") {
          value = "N/A";
        }
        return { name, value: JSON.stringify(value), inline: index % 2 === 0 };
      }
    );
    let embed2 = new EmbedBuilder()
      .setTitle("Game State")
      .addFields(build)
      .setTimestamp();
    await interaction.reply({
      embeds: [embed, embed2],
      ephemeral: channelMatch !== "admin",
    });
  },
};
