import type {ChatInputCommandInteraction, AutocompleteInteraction} from 'discord.js';
import {SlashCommandBuilder, EmbedBuilder} from 'discord.js';
import type {ChatChannelMatch} from './../discordBot';
import {checkAdminRequired} from './../discordUtility/utility';

import type {AppSettings, SettingsKeys} from './../../globals/settings';
import {settings} from './../../globals/settings';
import {app} from 'electron';
import {createWriteStream} from 'fs';
import {get} from 'https';
module.exports = {
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
          console.log('Download Completed');
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
      if (settings.updateSettings({[setting]: {[key]: newValue}})) {
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
