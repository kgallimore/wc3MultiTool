import { SlashCommandBuilder, Interaction } from "discord.js";
import type { ChatChannelMatch } from "./../discordBot";
import { checkAdminRequired } from "./../discordUtility/utility";

import { warControl } from "./../../globals/warControl";

import { Regions } from "wc3mt-lobby-container";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("controlwar")
    .setDescription("Control the Warcraft Instance")
    .addSubcommand((subcommand) =>
      subcommand.setName("quit").setDescription("Force quit Warcraft")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("closebnet").setDescription("Force quit Bnet")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("open")
        .setDescription("Open Warcraft")
        .addStringOption((option) =>
          option
            .setName("realm")
            .setDescription("Realm to open")
            .addChoices(
              { name: "Europe", value: "eu" },
              { name: "Americas", value: "us" }
            )
        )
    ),
  async execute(interaction: Interaction<"cached">, channelMatch: ChatChannelMatch) {
    if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;

    if (channelMatch !== "admin" && checkAdminRequired(interaction, channelMatch)) {
      await interaction.reply({
        content: "You are not allowed to run this command.",
        ephemeral: true,
      });
      return;
    }

    let command = interaction.options.getSubcommand();

    if (command) {
      await interaction.deferReply({ ephemeral: channelMatch !== "admin" });
      if (command === "quit") {
        let success = await warControl.forceQuitWar();
        await interaction.editReply(
          success ? "Quit Warcraft" : "Failed to quit Warcraft"
        );
      } else if (command === "closebnet") {
        let success = await warControl.forceQuitProcess("Battle.net.exe");
        await interaction.editReply(success ? "Closed Bnet" : "Failed to close Bnet");
      } else if (command === "open") {
        let success = await warControl.openWarcraft(
          interaction.options.getString("realm") as Regions | ""
        );
        await interaction.editReply(
          success ? "Opened Warcraft" : "Failed to open Warcraft"
        );
      }
    }
  },
};
