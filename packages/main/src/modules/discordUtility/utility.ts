import type { ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import type { ChatChannelMatch } from './../discordBot';
import { settings } from './../../globals/settings';

export function checkAdminRequired(
  interaction: ChatInputCommandInteraction<'cached'> | AutocompleteInteraction<'cached'>,
  channelMatch: ChatChannelMatch,
): boolean {
  return (
    channelMatch !== 'admin' &&
    !interaction.memberPermissions?.has('Administrator') &&
    !interaction.member.roles.cache.has(settings.values.discord.adminRole)
  );
}
