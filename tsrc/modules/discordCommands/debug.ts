import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import type { ChatChannelMatch } from "./../discordBot";
import { checkAdminRequired } from "./../discordUtility/utility";

import { screen, getActiveWindow } from "@nut-tree/nut-js";
import { windowManager, Window } from "node-window-manager";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("debug")
    .setDescription("Uploads and set a new map")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("screenshot")
        .setDescription("Uploads a screenshot of a target.")
        .addStringOption((option) =>
          option
            .setName("target")
            .setDescription("The target window to capture.")
            .setRequired(true)
            .setChoices(
              { name: "Warcraft", value: "warcraft" },
              { name: "Bnet", value: "bnet" },
              { name: "Desktop", value: "desktop" }
            )
        )
    ),
  async execute(
    interaction: ChatInputCommandInteraction<"cached">,
    channelMatch: ChatChannelMatch
  ) {
    if (checkAdminRequired(interaction, channelMatch)) {
      await interaction.reply({
        content: "You are not allowed to run this command.",
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply({ ephemeral: channelMatch !== "admin" });
    let command = interaction.options.getSubcommand();
    if (command === "screenshot") {
      let files: AttachmentBuilder;
      let capture: string | null = null;
      let target = interaction.options.getString("target", true);
      if (target === "warcraft" || target === "bnet") {
        target = target === "warcraft" ? "Warcraft III" : "Battle.net";
        let windows = windowManager.getWindows();
        let targetWindow: Window | null = null;
        for (const window of windows) {
          if (window.getTitle() === target) {
            targetWindow = window;
            break;
          }
        }
        if (targetWindow) {
          targetWindow.bringToTop();
          let nutWindow = await getActiveWindow();
          capture = await screen.captureRegion("ScreenCapture", nutWindow.region);
          files = new AttachmentBuilder(capture);
        } else {
          await interaction.editReply({ content: "Could not find the target window." });
          return;
        }
      } else if (target === "desktop") {
        capture = await screen.capture("DesktopCapture");
      } else {
        await interaction.editReply({ content: "Unknown target." });
        return;
      }
      if (capture) {
        files = new AttachmentBuilder(capture);
        await interaction.editReply({ content: "Success", files: [files] });
        return;
      }
      await interaction.editReply({ content: "Unknown error" });
      return;
    }
  },
};
