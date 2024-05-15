import type {ChatInputCommandInteraction, AutocompleteInteraction} from 'discord.js';
import {SlashCommandBuilder, AttachmentBuilder, EmbedBuilder} from 'discord.js';
import type {ChatChannelMatch, DiscordCommand} from './discordBot';
import {administration} from './administration';
import {lobbyControl} from './lobbyControl';
import {app} from 'electron';
import {logger} from './../globals/logger';
import {screen, getActiveWindow, getWindows} from '@nut-tree/nut-js';
import type {Window} from '@nut-tree/nut-js';
import type {AppSettings, SettingsKeys} from './../globals/settings';
import {settings} from './../globals/settings';
import {get} from 'https';
import {createWriteStream} from 'fs';
import {clientState} from './../globals/clientState';
import {gameState} from './../globals/gameState';
import {warControl} from './../globals/warControl';

import type {Regions} from 'wc3mt-lobby-container';
const AdministrationCommands: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName('waradmin')
    .setDescription('Administrative Wc3mt tools')
    .addSubcommandGroup(subcommandGroup =>
      subcommandGroup
        .setName('adminonly')
        .setDescription('Requires admin rights')
        .addSubcommand(subcommand =>
          subcommand
            .setName('ban')
            .setDescription('Ban a user')
            .addStringOption(option =>
              option
                .setName('user')
                .setRequired(true)
                .setDescription('BattleTag to ban')
                .setAutocomplete(true),
            )
            .addStringOption(option => option.setName('reason').setDescription('Reason')),
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('unban')
            .setDescription('Unban a user')
            .addStringOption(option =>
              option.setName('user').setRequired(true).setDescription('BattleTag to unban'),
            ),
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('mod')
            .setDescription('Add mod or admin')
            .addStringOption(option =>
              option
                .setName('user')
                .setRequired(true)
                .setDescription('BattleTag to set permissions of')
                .setAutocomplete(true),
            )
            .addStringOption(option =>
              option
                .setName('role')
                .setDescription('The role to give')
                .addChoices(
                  {name: 'Admin', value: 'admin'},
                  {name: 'Moderator', value: 'moderator'},
                  {name: 'Swapper', value: 'swapper'},
                ),
            ),
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('unperm')
            .setDescription("Remove a user's permissions")
            .addStringOption(option =>
              option
                .setName('user')
                .setRequired(true)
                .setDescription('BattleTag to unperm')
                .setAutocomplete(true),
            ),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('checkuser')
        .setDescription("Check a user's ban/whitelist status and/or perms")
        .addStringOption(option =>
          option
            .setName('user')
            .setRequired(true)
            .setDescription('BattleTag to check')
            .setAutocomplete(true),
        ),
    ),
  async execute(
    interaction: ChatInputCommandInteraction<'cached'>,
    channelMatch: ChatChannelMatch,
  ) {
    const adminOnly = interaction.options.getSubcommandGroup() === 'adminonly';
    if (adminOnly && checkAdminRequired(interaction, channelMatch)) {
      await interaction.reply({
        content: 'You are not allowed to run this command.',
        ephemeral: true,
      });
      return;
    }

    const command = interaction.options.getSubcommand();
    const ranUser = interaction.member.displayName;

    if (command) {
      const targetUser = interaction.options.getString('user', true);
      let content: string = 'There was an error executing this command';
      if (command === 'ban') {
        const reason = interaction.options.getString('reason');
        const success = await administration.banPlayer(
          targetUser,
          ranUser,
          'client',
          reason ?? undefined,
          true,
        );
        if (success === true) {
          content = 'Banned ' + targetUser + ' by ' + ranUser + (reason ? ' for ' + reason : '');
        } else {
          content = 'Failed to ban ' + targetUser + '. ' + success.reason;
        }
      } else if (command === 'unban') {
        const success = await administration.unBanPlayer(targetUser, ranUser);
        content = success
          ? 'Unbanned ' + targetUser + ' by ' + ranUser
          : 'Failed to unban ' + targetUser;
      } else if (command === 'mod') {
        const role =
          (interaction.options.getString('reason') as 'admin' | 'moderator' | 'swapper' | null) ??
          'moderator';
        const success = await administration.addAdmin(targetUser, ranUser, 'client', role, true);
        content = success
          ? 'Set ' + targetUser + ' to ' + role + ' by ' + ranUser
          : 'Failed to set role of ' + targetUser;
      } else if (command === 'unperm') {
        const success = await administration.removeAdmin(targetUser, ranUser, true);
        content = success
          ? 'Removed ' + targetUser + ' permissions '
          : 'Failed to remove permissions of ' + targetUser;
      } else if (command === 'checkuser') {
        const status = await administration.checkPlayer(targetUser);
        const role = await administration.getRole(targetUser);
        if (role) {
          content = targetUser + ' has the ' + role + ' role. ';
        } else {
          content = '';
        }
        if (!status.type) {
          content += targetUser + ' is not on the black/white list.';
        } else {
          content +=
            'Player ' + targetUser + ' is on the ' + status.type + 'list' + status.reason
              ? ' for ' + status.reason
              : '';
        }
      }
      await interaction.reply({
        content,
        ephemeral: adminOnly && channelMatch !== 'admin',
      });
    }
  },
  async autoComplete(
    interaction: AutocompleteInteraction<'cached'>,
    channelMatch: ChatChannelMatch,
  ) {
    // TODO: add autocomplete from database
    const command = interaction.options.getSubcommand();
    if (!['checkuser', 'ban', 'mod', 'unperm'].includes(command)) {
      return;
    }
    const adminOnly = interaction.options.getSubcommandGroup() === 'adminonly';
    if (adminOnly && checkAdminRequired(interaction, channelMatch)) {
      await interaction.respond([
        {name: 'You are not allowed to run this command.', value: 'null'},
      ]);
      return;
    }
    const focusedOption = interaction.options.getFocused(true);
    if (lobbyControl.microLobby) {
      const matches = lobbyControl.microLobby.searchPlayer(focusedOption.value);
      await interaction.respond(
        matches.map(playerName => {
          return {name: playerName, value: playerName};
        }),
      );
    } else {
      await interaction.respond([]);
      return;
    }
  },
};
const DebugCommands: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Uploads and set a new map')
    .addSubcommand(subcommand =>
      subcommand
        .setName('screenshot')
        .setDescription('Uploads a screenshot of a target.')
        .addStringOption(option =>
          option
            .setName('target')
            .setDescription('The target window to capture.')
            .setRequired(true)
            .setChoices(
              {name: 'Warcraft', value: 'warcraft'},
              {name: 'Bnet', value: 'bnet'},
              {name: 'Desktop', value: 'desktop'},
            ),
        ),
    ),
  async execute(
    interaction: ChatInputCommandInteraction<'cached'>,
    channelMatch: ChatChannelMatch,
  ) {
    try {
      if (checkAdminRequired(interaction, channelMatch)) {
        await interaction.reply({
          content: 'You are not allowed to run this command.',
          ephemeral: true,
        });
        return;
      }
    } catch (e) {
      logger.error('Discord Debug', 'Unknown admin check debug error.', e);
      console.error(e);
    }

    await interaction.deferReply({ephemeral: channelMatch !== 'admin'});
    const command = interaction.options.getSubcommand();
    if (command === 'screenshot') {
      logger.info('Capturing Screenshot');
      let files: AttachmentBuilder;
      let capture: string | null = null;
      let target = interaction.options.getString('target', true).toLowerCase();
      if (target === 'warcraft' || target === 'bnet') {
        try {
          target = target === 'warcraft' ? 'Warcraft III' : 'Battle.net';
          logger.info('Discord Debug', 'Screen-shoting ' + target);
          const windows = await getWindows();
          let targetWindow: Window | null = null;
          for (const window of windows) {
            if ((await window.title) === target) {
              targetWindow = window;
              break;
            }
          }
          if (targetWindow) {
            // TODO: Focus window
            const nutWindow = await getActiveWindow();
            capture = await screen.captureRegion(
              'ScreenCapture',
              nutWindow.region,
              undefined,
              app.getPath('documents'),
            );
            files = new AttachmentBuilder(capture);
            logger.info('Discord Debug', 'Screen-shot ' + target);
          } else {
            logger.warn('Discord Debug', 'Could not find the target window.');
            await interaction.editReply({content: 'Could not find the target window.'});
            return;
          }
        } catch (e) {
          logger.error('Discord Debug', 'Unknown WC3 or Bnet capture debug error.', e);
          await interaction.editReply({
            content: 'Unknown WC3 or Bnet capture debug error.',
          });
          return;
        }
      } else if (target === 'desktop') {
        try {
          logger.info('Discord Debug', 'Screen-shoting the desktop');
          capture = await screen.capture('DesktopCapture', undefined, app.getPath('documents'));
        } catch (e) {
          logger.error('Discord Debug', 'Unknown desktop capture debug error.', e);
          await interaction.editReply({
            content: 'Unknown desktop capture debug error.',
          });
          return;
        }
      } else {
        logger.warn('Discord Debug', 'Unknown screenshot target.');
        await interaction.editReply({content: 'Unknown target.'});
        return;
      }
      if (capture) {
        try {
          files = new AttachmentBuilder(capture);
          logger.info('Discord Debug', 'Uploading screenshot.');
        } catch (e) {
          logger.error('Discord Debug', 'AttachmentBuilder error.', e);
          await interaction.editReply({
            content: 'AttachmentBuilder error.',
          });
          return;
        }
        try {
          await interaction.editReply({content: 'Success', files: [files]});
          return;
        } catch (e) {
          logger.error('Discord Debug', 'Unknown file upload debug error.', e);
          await interaction.editReply({
            content: 'Unknown file upload debug error.',
          });
          return;
        }
      }
      logger.warn('Discord Debug', 'Unknown screenshot error.');
      await interaction.editReply({content: 'Unknown error'});
      return;
    }
  },
};
const SettingsCommands: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Change Wc3mt settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('uploadmap')
        .setDescription('Uploads and set a new map')
        .addAttachmentOption(attachment =>
          attachment.setName('file').setRequired(true).setDescription('The target map'),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the target setting')
        .addStringOption(option =>
          option
            .setName('setting')
            .setDescription('The setting group')
            .setRequired(true)
            .addChoices(
              ...Object.keys(settings.values).map(name => {
                return {name, value: name};
              }),
            ),
        )
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('The key to set')
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption(option =>
          option.setName('value').setDescription('The value to set').setRequired(true),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Set the target setting')
        .addStringOption(option =>
          option
            .setName('setting')
            .setDescription('The setting group')
            .setRequired(true)
            .addChoices(
              ...Object.keys(settings.values).map(name => {
                return {name, value: name};
              }),
            ),
        )
        .addStringOption(option =>
          option.setName('key').setDescription('The key to get').setAutocomplete(true),
        ),
    ),
  async execute(
    interaction: ChatInputCommandInteraction<'cached'>,
    channelMatch: ChatChannelMatch,
  ) {
    if (checkAdminRequired(interaction, channelMatch)) {
      await interaction.reply({
        content: 'You are not allowed to run this command.',
        ephemeral: true,
      });
      return;
    }
    const command = interaction.options.getSubcommand();
    if (command === 'uploadmap') {
      await interaction.deferReply({ephemeral: channelMatch !== 'admin'});
      const file = interaction.options.getAttachment('file', true);
      if (file.size > 150000000) {
        await interaction.editReply({
          content: 'How did you upload a map that big? Discord must have been updated.',
        });
        return;
      }
      if (!file.name) {
        await interaction.editReply({
          content: 'File name required',
        });
        return;
      }
      if (!['w3x', 'w3m'].includes(file.name.split('.')[file.name.split('.').length - 1])) {
        await interaction.editReply({
          content: 'Please upload a .w3m or a .w3x',
        });
        return;
      }
      get(file.url, res => {
        // Image will be stored at this path
        const path = `${app
          .getPath('home')
          .replace(/\\/g, '/')}/Documents/Warcraft III/Maps/MultiTool/${file.name}`;
        const filePath = createWriteStream(path);
        res.pipe(filePath);
        filePath.on('finish', () => {
          filePath.close();
          interaction.editReply({
            content: 'Successfully downloaded ' + file.name,
          });
          settings.updateSettings({autoHost: {mapPath: path}});
        });
      });
    } else if (command === 'set') {
      const setting = interaction.options.getString('setting', true) as keyof AppSettings;
      const key = interaction.options.getString('key', true) as SettingsKeys;
      const value = interaction.options.getString('value', true);
      let newValue: string | boolean | number;
      // @ts-expect-error This may break
      const oldVal = settings.values[setting]?.[key];
      if (oldVal === undefined) {
        await interaction.reply({
          content: 'Invalid key on setting.',
          ephemeral: channelMatch !== 'admin',
        });
        return;
      }
      if (typeof oldVal === 'boolean') {
        newValue = value.toLowerCase() === 'true';
      } else if (typeof oldVal === 'number') {
        newValue = parseInt(value);
        if (newValue.toString() !== value) {
          await interaction.reply({
            content: 'Please set a number',
            ephemeral: channelMatch !== 'admin',
          });
          return;
        }
      } else if (typeof oldVal === 'string') {
        newValue = value;
      } else {
        await interaction.reply({
          content: 'This key is not yet implemented on Discord',
          ephemeral: channelMatch !== 'admin',
        });
        return;
      }
      if (await settings.updateSettings({[setting]: {[key]: newValue}})) {
        await interaction.reply({
          content: 'Successfully updated ' + setting + ' ' + key + ' to ' + value,
          ephemeral: channelMatch !== 'admin',
        });
      } else {
        await interaction.reply({
          content: 'Something went wrong.',
          ephemeral: channelMatch !== 'admin',
        });
      }
    } else if (command === 'get') {
      const setting = interaction.options.getString('setting', true) as keyof AppSettings;
      const key = interaction.options.getString('key') as SettingsKeys;
      if (key) {
        if (Object.keys(settings.values[setting]).includes(key)) {
          // @ts-expect-error This is a fine
          let value: string | boolean | number | string[] = settings.values[setting][key];
          if (
            (key.toLowerCase().includes('token') || key.toLowerCase().includes('password')) &&
            value
          ) {
            value = '*********';
          }
          await interaction.reply({
            content: setting + ': ' + key + ': ' + JSON.stringify(value),
            ephemeral: channelMatch !== 'admin',
          });
        } else {
          await interaction.reply({
            content: 'Invalid key for ' + setting,
            ephemeral: channelMatch !== 'admin',
          });
        }
      } else {
        const clean = settings.getCleanSetting(setting);
        const build = Object.entries(clean).map(([key, value]) => {
          return {name: key, value, inline: true};
        });
        const embed = new EmbedBuilder().setTitle(setting).addFields(build).setTimestamp();
        await interaction.reply({
          embeds: [embed],
          ephemeral: channelMatch !== 'admin',
        });
      }
    }
  },
  async autoComplete(
    interaction: AutocompleteInteraction<'cached'>,
    channelMatch: ChatChannelMatch,
  ) {
    if (checkAdminRequired(interaction, channelMatch)) {
      await interaction.respond([
        {name: 'You are not allowed to run this command.', value: 'null'},
      ]);
      return;
    }
    const focusedOption = interaction.options.getFocused(true);
    const command = interaction.options.getSubcommand();
    let response: {name: string; value: string}[] = [];
    if (command === 'get' || command === 'set') {
      const setting = interaction.options.getString('setting', true) as keyof AppSettings;
      if (focusedOption.name === 'key') {
        response = Object.keys(settings.values[setting])
          .filter(key => key.match(new RegExp(focusedOption.value, 'i')))
          .map(key => {
            return {name: key, value: key};
          });
        response.length = Math.min(response.length, 5);
      }
    }
    await interaction.respond(response);
  },
};
const StatusCommands: DiscordCommand = {
  data: new SlashCommandBuilder().setName('state').setDescription('Get current status.'),
  async execute(
    interaction: ChatInputCommandInteraction<'cached'>,
    channelMatch: ChatChannelMatch,
  ) {
    if (!interaction.isChatInputCommand() || !interaction.inCachedGuild()) return;
    if (channelMatch !== 'admin' && checkAdminRequired(interaction, channelMatch)) {
      await interaction.reply({
        content: 'You are not allowed to run this command.',
        ephemeral: true,
      });
      return;
    }
    let build = (Object.entries(clientState.values) as [string, string][]).map(
      ([name, value], index) => {
        if (value === '' || value.toString() === '') {
          value = 'N/A';
        }
        return {name, value: JSON.stringify(value), inline: index % 2 === 0};
      },
    );
    const embed = new EmbedBuilder().setTitle('Client State').addFields(build).setTimestamp();
    build = (Object.entries(gameState.values) as [string, string][]).map(([name, value], index) => {
      if (value === '' || value.toString() === '') {
        value = 'N/A';
      }
      return {name, value: JSON.stringify(value), inline: index % 2 === 0};
    });
    const embed2 = new EmbedBuilder().setTitle('Game State').addFields(build).setTimestamp();
    await interaction.reply({
      embeds: [embed, embed2],
      ephemeral: channelMatch !== 'admin',
    });
  },
};
export const WarControlCommands: DiscordCommand = {
  data: new SlashCommandBuilder()
    .setName('controlwar')
    .setDescription('Control the Warcraft Instance')
    .addSubcommand(subcommand => subcommand.setName('quit').setDescription('Force quit Warcraft'))
    .addSubcommand(subcommand => subcommand.setName('closebnet').setDescription('Force quit Bnet'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('open')
        .setDescription('Open Warcraft')
        .addStringOption(option =>
          option
            .setName('realm')
            .setDescription('Realm to open')
            .addChoices({name: 'Europe', value: 'eu'}, {name: 'Americas', value: 'us'}),
        ),
    ),
  async execute(
    interaction: ChatInputCommandInteraction<'cached'>,
    channelMatch: ChatChannelMatch,
  ) {
    if (channelMatch !== 'admin' && checkAdminRequired(interaction, channelMatch)) {
      await interaction.reply({
        content: 'You are not allowed to run this command.',
        ephemeral: true,
      });
      return;
    }

    const command = interaction.options.getSubcommand();

    if (command) {
      await interaction.deferReply({ephemeral: channelMatch !== 'admin'});
      if (command === 'quit') {
        const success = await warControl.forceQuitWar();
        await interaction.editReply(success ? 'Quit Warcraft' : 'Failed to quit Warcraft');
      } else if (command === 'closebnet') {
        const success = await warControl.forceQuitProcess('Battle.net.exe');
        await interaction.editReply(success ? 'Closed Bnet' : 'Failed to close Bnet');
      } else if (command === 'open') {
        const success = await warControl.openWarcraft(
          interaction.options.getString('realm') as Regions | '',
        );
        await interaction.editReply(success ? 'Opened Warcraft' : 'Failed to open Warcraft');
      }
    }
  },
};
function checkAdminRequired(
  interaction: ChatInputCommandInteraction<'cached'> | AutocompleteInteraction<'cached'>,
  channelMatch: ChatChannelMatch,
): boolean {

  return (
    channelMatch !== 'admin' &&
    !interaction.memberPermissions?.has('Administrator') &&
    !interaction.member.roles.cache.has(settings.values.discord.adminRole)
  );
}
export const DiscordCommands = {
  AdministrationCommands,
  DebugCommands,
  SettingsCommands,
  StatusCommands,
  WarControlCommands,
};
