import { SlashCommandBuilder, Interaction, CacheType } from "discord.js";
import type { ChatChannelMatch } from "./../discordBot";
import { settings } from "./../../globals/settings";
import { administration } from "./../administration";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("waradmin")
    .setDescription("Administrative Wc3mt tools")
    .addSubcommandGroup((subcommandGroup) =>
      subcommandGroup
        .setName("adminonly")
        .setDescription("Requires admin rights")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("ban")
            .setDescription("Ban a user")
            .addStringOption((option) =>
              option.setName("user").setRequired(true).setDescription("BattleTag to ban")
            )
            .addStringOption((option) =>
              option.setName("reason").setDescription("Reason")
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("unban")
            .setDescription("Unban a user")
            .addStringOption((option) =>
              option
                .setName("user")
                .setRequired(true)
                .setDescription("BattleTag to unban")
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("mod")
            .setDescription("Add mod or admin")
            .addStringOption((option) =>
              option
                .setName("user")
                .setRequired(true)
                .setDescription("BattleTag to set permissions of")
            )
            .addStringOption((option) =>
              option
                .setName("role")
                .setDescription("The role to give")
                .addChoices(
                  { name: "Admin", value: "admin" },
                  { name: "Moderator", value: "moderator" },
                  { name: "Swapper", value: "swapper" }
                )
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("unperm")
            .setDescription("Remove a user's permissions")
            .addStringOption((option) =>
              option
                .setName("user")
                .setRequired(true)
                .setDescription("BattleTag to unperm")
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("checkuser")
        .setDescription("Check a user's ban/whitelist status and/or perms")
        .addStringOption((option) =>
          option.setName("user").setRequired(true).setDescription("BattleTag to check")
        )
    ),
  async execute(interaction: Interaction<CacheType>, channelMatch: ChatChannelMatch) {
    if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;
    let adminOnly = interaction.options.getSubcommandGroup() === "adminonly";
    if (
      adminOnly &&
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

    let command = interaction.options.getSubcommand();
    let ranUser = interaction.member.displayName;

    if (command) {
      let targetUser = interaction.options.getString("user", true);
      let content: string = "There was an error executing this command";
      if (command === "ban") {
        let reason = interaction.options.getString("reason");
        let success = administration.banPlayer(
          targetUser,
          ranUser,
          "client",
          reason ?? undefined,
          true
        );
        if (success === true) {
          content =
            "Banned " + targetUser + " by " + ranUser + (reason ? " for " + reason : "");
        } else {
          content = "Failed to ban " + targetUser + ". " + success.reason;
        }
      } else if (command === "unban") {
        let success = administration.unBanPlayer(targetUser, ranUser);
        content = success
          ? "Unbanned " + targetUser + " by " + ranUser
          : "Failed to unban " + targetUser;
      } else if (command === "mod") {
        let role =
          (interaction.options.getString("reason") as
            | "admin"
            | "moderator"
            | "swapper"
            | null) ?? "moderator";
        let success = administration.addAdmin(targetUser, ranUser, "client", role, true);
        content = success
          ? "Set " + targetUser + " to " + role + " by " + ranUser
          : "Failed to set role of " + targetUser;
      } else if (command === "unperm") {
        let success = administration.removeAdmin(targetUser, ranUser, true);
        content = success
          ? "Removed " + targetUser + " permissions "
          : "Failed to remove permissions of " + targetUser;
      } else if (command === "checkuser") {
        let status = administration.checkPlayer(targetUser);
        let role = administration.getRole(targetUser);
        if (role) {
          content = targetUser + " has the " + role + " role. ";
        } else {
          content = "";
        }
        if (!status.type) {
          content += targetUser + " is not on the black/white list.";
        } else {
          content +=
            "Player " + targetUser + " is on the " + status.type + "list" + status.reason
              ? " for " + status.reason
              : "";
        }
      }
      await interaction.reply({
        content,
        ephemeral: adminOnly && channelMatch !== "admin",
      });
    }
  },
};
