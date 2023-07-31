import type {ChatInputCommandInteraction} from 'discord.js';
import {SlashCommandBuilder, AttachmentBuilder} from 'discord.js';
import type {ChatChannelMatch} from '/~/modules/discordBot';
import {checkAdminRequired} from '/~/modules/discordUtility/utility';
import {app} from 'electron';
import {logger} from '/~/globals/logger';
import {screen, getActiveWindow} from '@nut-tree/nut-js';
import type {Window} from 'node-window-manager';
import {windowManager} from 'node-window-manager';

module.exports = {
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
          const windows = windowManager.getWindows();
          let targetWindow: Window | null = null;
          for (const window of windows) {
            if (window.getTitle() === target) {
              targetWindow = window;
              break;
            }
          }
          if (targetWindow) {
            targetWindow.bringToTop();
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
