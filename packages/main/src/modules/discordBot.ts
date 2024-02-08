import {ModuleBase} from '../moduleBase';

import type {SettingsUpdates} from '../globals/settings';

import Discord, {Collection} from 'discord.js';
import {EmbedBuilder, InteractionType, IntentsBitField} from 'discord.js';
import {Routes} from 'discord-api-types/v10';
import {REST} from '@discordjs/rest';
import type {mmdResults} from './replayHandler';
import type {PlayerTeamsData} from 'wc3mt-lobby-container';
import type {LobbyUpdatesExtended} from './lobbyControl';
import {DeColorName, type AdminCommands} from '../utility';
import {app} from 'electron';
import type {GameState} from '../globals/gameState';
import type {GameSocketEvents} from '../globals/gameSocket';
import {readdir} from 'fs';
import {join} from 'path';

import {administration} from './administration';

export type ChatChannelMatch = 'chat' | 'announce' | 'admin' | '';

class DiscordBot extends ModuleBase {
  client: Discord.Client | null = null;
  announceChannel: Discord.TextChannel | null = null;
  chatChannel: Discord.TextChannel | null = null;
  adminChannel: Discord.TextChannel | null = null;
  private _embed: EmbedBuilder | null = null;
  private _sentEmbed: Discord.Message | null = null;
  private _sentEmbedData: PlayerTeamsData | null = null;
  private _currentThread: Discord.ThreadChannel | null = null;
  private _lobbyState: {
    status: 'started' | 'closed' | 'active' | 'ended';
    name: string;
  } = {
    status: 'closed',
    name: '',
  };

  private _closingLobby: boolean = false;
  private _lobbyUpdates: {lastUpdate: number; updateTimer: NodeJS.Timeout | null} = {
    lastUpdate: 0,
    updateTimer: null,
  };
  commandInteractions: Discord.Collection<
    string,
    {
      execute: (
        interaction: Discord.ChatInputCommandInteraction<'cached'>,
        channel: ChatChannelMatch,
      ) => Promise<void>;
      autoComplete?: (
        interaction: Discord.AutocompleteInteraction<'cached'>,
        channel: ChatChannelMatch,
      ) => Promise<void>;
    }
  > = new Collection();
  commands: Discord.RESTPostAPIApplicationCommandsJSONBody[] = [];

  constructor() {
    super('Discord', {
      listeners: [
        'gameSocketEvent',
        'settingsUpdate',
        'lobbyUpdate',
        'gameStateUpdates',
        'warnings',
        'errors',
      ],
    });
    const directory = join(app.getAppPath(), 'packages/main/src/modules/discordCommands');
    readdir(directory, (err, files) => {
      if (err) {
        this.error(err);
        return;
      }
      if (files) {
        files = files.filter(file => file.endsWith('.js'));
        for (const file of files) {
          const command = require(join(directory, file));
          this.commandInteractions.set(command.data.name, command);
          this.commands.push(command.data.toJSON());
        }
        this.initialize();
      }
    });
  }

  protected onSettingsUpdate(updates: SettingsUpdates) {
    if (updates.discord) {
      if (updates.discord.token !== undefined) {
        this.initialize();
      }
      if (
        updates.discord.announceChannel !== undefined ||
        updates.discord.chatChannel !== undefined ||
        updates.discord.adminChannel !== undefined
      ) {
        this.getChannels();
      }
      if (updates.discord.useThreads !== undefined) {
        // TODO: Close threads?
      }
    }
  }

  protected onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    if (!this.settings.values.discord.enabled) {
      return;
    }
    if (updates.newLobby) {
      this.sendNewLobby();
    } else if (updates.leftLobby) {
      this.lobbyClosed();
    } else if (
      updates.lobbyReady === undefined &&
      updates.stale === undefined &&
      updates.chatMessage === undefined
    ) {
      this.updateDiscordLobby();
    }
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (!this.settings.values.discord.enabled) {
      return;
    }
    if (updates.menuState === 'LOADING_SCREEN') {
      this.lobbyStarted();
    }
    if (updates.inGame === false) {
      this.lobbyEnded(null);
    }
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (!this.settings.values.discord.enabled) {
      return;
    }
    if (
      events.disconnected ||
      (events.MultiplayerGameLeave && this.gameState.values.menuState !== 'LOADING_SCREEN')
    ) {
      this.lobbyClosed();
    }
    if (
      events.processedChat &&
      (this.chatChannel || (this.settings.values.discord.useThreads && this.announceChannel))
    ) {
      this.handleLobbyMessage(events.processedChat);
    }
  }

  private initialize() {
    this.client?.destroy();
    this.client = null;
    if (!this.settings.values.discord.enabled) {
      return;
    }
    if (!this.settings.values.discord.token) {
      return;
    }
    this.client = new Discord.Client({
      intents: [
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.Guilds,
      ],
    });
    this.client.on('ready', () => {
      if (!this.client?.user) {
        this.error('Missing client user.');
        return;
      }
      this.client.user.setStatus('online');
      this.client.user.setUsername('WC3 MultiTool');
      if (app.isPackaged) {
        this.client.user.setAvatar('./images/wc3_auto_balancer_v2.png');
      }
      this.verbose(`Logged in as ${this.client.user.tag}!`);
      this.client.user.setActivity({
        name: 'war.trenchguns.com',
        type: Discord.ActivityType.Watching,
      });
      this.client.guilds.cache.forEach(guild => this.registerSlashCommands(guild.id));
      this.getChannels();
    });

    this.client.on('interactionCreate', async interaction => {
      if (!interaction.inCachedGuild()) return;
      const channelMatch = this.matchChannel(interaction.channel);
      if (interaction.isChatInputCommand()) {
        const command = this.commandInteractions.get(interaction.commandName);

        if (!command) {
          return;
        }

        try {
          await command.execute(interaction, channelMatch);
        } catch (error) {
          this.error(error);
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
        }
      } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        const command = this.commandInteractions.get(interaction.commandName);
        if (!command?.autoComplete) {
          return;
        }
        try {
          await command.autoComplete(interaction, channelMatch);
        } catch (error) {
          this.error(error);
        }
      }
    });

    this.client.on('messageCreate', async msg => {
      if (
        (msg.channel === this._currentThread ||
          (msg.channel === this.chatChannel && !this.settings.values.discord.useThreads)) &&
        !msg.author.bot
      ) {
        if (msg.content.startsWith('?')) {
          this.info('Running command', msg.author.username, msg.content);
          const runCom = await administration.runCommand(
            msg.content.slice(1).split(' ')[0] as AdminCommands,
            msg.member?.roles.cache.get(this.settings.values.discord.adminRole) ||
              msg.member?.permissions.has('Administrator')
              ? 'admin'
              : null,
            msg.author.username,
            msg.content.split(' ').slice(1),
          );
          if (runCom) {
            msg.reply(runCom);
          }
        }
        if (this.settings.values.discord.bidirectionalChat) {
          this.gameSocket.sendChatMessage('(DC)' + msg.author.username + ': ' + msg.content);
        }
      } else if (
        msg.content.startsWith('?') &&
        msg.content.includes(this.settings.values.discord.customName)
      ) {
        this.info('Running bot specific command', msg.author.username, msg.content);
        const runCom = await administration.runCommand(
          msg.content.slice(1).split(' ')[0] as AdminCommands,
          msg.member?.roles.cache.get(this.settings.values.discord.adminRole) ||
            msg.member?.permissions.has('Administrator') ||
            msg.channel == this.adminChannel
            ? 'admin'
            : null,
          msg.author.username,
          msg.content.split(' ').slice(1),
        );
        if (runCom) {
          msg.reply(runCom);
        }
      }
    });

    this.client.login(this.settings.values.discord.token);
  }

  matchChannel(channel: Discord.TextBasedChannel | null): ChatChannelMatch {
    if (!channel) return '';
    if (channel === this.adminChannel) {
      return 'admin';
    } else if (channel === this.chatChannel) {
      return 'chat';
    } else if (channel === this.announceChannel) {
      return 'announce';
    }
    return '';
  }

  async registerSlashCommands(guildId: string) {
    if (!this.settings.values.discord.token || !this.client?.user?.id) {
      return;
    }
    const rest = new REST({version: '10'}).setToken(this.settings.values.discord.token);
    try {
      await rest.put(Routes.applicationGuildCommands(this.client.user.id, guildId), {
        body: this.commands,
      });
    } catch (error) {
      console.error(error);
    }
  }

  private getChannels() {
    if (!this.client) {
      this.warn('Tried to get discord channels before client is available.');
      return;
    }
    // Flush channels just in case the new ones don't exist or the channels aren't wanted.
    this.chatChannel = null;
    this.announceChannel = null;
    this.adminChannel = null;
    if (
      this.settings.values.discord.chatChannel ||
      this.settings.values.discord.announceChannel ||
      this.settings.values.discord.adminChannel
    ) {
      this.client.channels.cache
        .filter(channel => channel.type === Discord.ChannelType.GuildText)
        .forEach(channel => {
          if (
            (this.settings.values.discord.announceChannel &&
              (channel as Discord.TextChannel).name ===
                this.settings.values.discord.announceChannel) ||
            channel.id === this.settings.values.discord.announceChannel
          ) {
            this.announceChannel = channel as Discord.TextChannel;
          }
          if (
            (this.settings.values.discord.chatChannel &&
              (channel as Discord.TextChannel).name === this.settings.values.discord.chatChannel) ||
            channel.id === this.settings.values.discord.chatChannel
          ) {
            this.chatChannel = channel as Discord.TextChannel;
          }
          if (
            (this.settings.values.discord.adminChannel &&
              (channel as Discord.TextChannel).name ===
                this.settings.values.discord.adminChannel) ||
            channel.id === this.settings.values.discord.adminChannel
          ) {
            this.adminChannel = channel as Discord.TextChannel;
          }
        });
      if (this.settings.values.discord.chatChannel && !this.chatChannel) {
        this.warn('Chat channel set, but could not be found.');
      }
      if (this.settings.values.discord.announceChannel && !this.announceChannel) {
        this.warn('Announce channel set, but could not be found.');
      }
      if (this.settings.values.discord.adminChannel && !this.adminChannel) {
        this.warn('Admin channel set, but could not be found.');
      }
    } else {
      this.verbose('No channels set.');
    }
  }

  async handleLobbyMessage(processedChat: GameSocketEvents['processedChat'], callCount = 0) {
    if (!processedChat || callCount > 50) {
      return;
    }
    const toSend =
      processedChat.sender +
      ': ' +
      (processedChat.translated
        ? processedChat.translated + '||' + processedChat.content + '||'
        : processedChat.content);
    if (this.settings.values.discord.useThreads && this.announceChannel) {
      if (!this._currentThread) {
        if (this._sentEmbed) {
          if (this._sentEmbed.thread) {
            this._currentThread = this._sentEmbed.thread;
          } else {
            const newThread = await this._sentEmbed.startThread({
              name: this.lobby.microLobby?.lobbyStatic.lobbyName ?? 'Lobby Chat',
            });
            this._currentThread = newThread;
          }
        } else {
          this.info('Waiting for new embed');
          setTimeout(() => {
            this.handleLobbyMessage(processedChat, callCount + 1);
          }, 100);
          return;
        }
      }
      this.sendMessage(toSend, 'thread');
    } else if (this.chatChannel) {
      this.sendMessage(toSend, 'chat');
    }
  }

  // TODO: Reimplement with new lobby updates

  private async sendNewLobby() {
    if (this._embed && this._sentEmbed) {
      await this.lobbyClosed();
    }
    if (!this.lobby?.microLobby) {
      return;
    }
    const lobbyData = this.lobby.microLobby.exportMin();
    let data = this.lobby.microLobby.exportTeamStructure();
    this._embed = new EmbedBuilder()
      .setTitle(
        (lobbyData.region === 'us' ? ':flag_us: ' : ':flag_eu: ') + lobbyData.lobbyStatic.lobbyName,
      )
      .setColor('#0099ff')
      .setDescription('Click above to launch WC3MT and join the lobby')
      .setURL(
        `https://${app.isPackaged ? 'war' : 'dev'}.trenchguns.com/?lobbyName=${encodeURI(
          lobbyData.lobbyStatic.lobbyName,
        )}`,
      )
      .addFields([
        {name: 'Map Name', value: DeColorName(lobbyData.lobbyStatic.mapData.mapName)},
        {name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:R> `},
        {
          name: 'Observers',
          value: lobbyData.lobbyStatic.mapFlags.typeObservers !== 0 ? 'Yes' : 'No',
          inline: true,
        },
      ]);
    if (
      Object.keys(data).length ===
      Object.values(data).reduce((currentNum, players) => currentNum + players.length, 0)
    ) {
      data = {
        FFA: Object.values(data).reduce((currentNum, players) => currentNum.concat(players), []),
      };
    }
    Object.entries(data).forEach(([teamName, data]) => {
      const combinedData = data.map(
        data =>
          data.name +
          (data.data.extra && data.data.extra.rating > -1
            ? ': ' +
              [
                this.settings.values.elo.hideElo ? 'Hidden' : data.data.extra.rating,
                data.data.extra.rank,
                data.data.extra.wins,
                data.data.extra.losses,
              ].join('/')
            : '') +
          (data.realPlayer ? `\n<t:${Math.floor(data.data.joinedAt / 1000)}:R>` : ''),
      );
      this._embed?.addFields([{name: teamName, value: combinedData.join('\n') ?? ''}]);
    });

    this.client?.user?.setActivity({
      name: 'Warcraft III - ' + lobbyData.lobbyStatic.lobbyName,
      type: Discord.ActivityType.Playing,
    });
    this._lobbyState.status = 'active';
    this._lobbyState.name = lobbyData.lobbyStatic.lobbyName;
    this._sentEmbed = await this.sendMessage({embeds: [this._embed]}, 'announce');
  }

  private async lobbyStarted() {
    if (this._embed && this._sentEmbed && this._lobbyState.status === 'active') {
      const newEmbed = new EmbedBuilder(this._embed.data);
      newEmbed.setDescription('Game has started');
      newEmbed.setColor('#FF3D14');
      newEmbed.setURL(null);
      newEmbed.addFields([{name: 'Game Started', value: `<t:${Math.floor(Date.now() / 1000)}:R>`}]);
      this._lobbyState.status = 'started';
      this._sentEmbed.edit({embeds: [newEmbed]});
      if (this._lobbyState.name && !this.settings.values.discord.useThreads)
        this.sendMessage('Game started. End of chat for ' + this._lobbyState.name);
    }
  }

  async lobbyEnded(results: mmdResults | null) {
    if (this._embed && this._sentEmbed) {
      if (this._lobbyState.status === 'started') {
        const newEmbed = new EmbedBuilder(this._embed.data);
        newEmbed.setDescription('Game has ended');
        newEmbed.setColor('#228B22');
        newEmbed.setURL(null);
        if (results)
          newEmbed.data.fields?.forEach(field => {
            // TODO append results
            for (const [playerName, _] of Object.entries(results.list)) {
              if (field.value.match(new RegExp(playerName, 'i'))) {
                /* TODO: update discord */
              }
            }
            Object.entries(results.list).some(_ => {});
          });
        newEmbed.addFields([{name: 'Game Ended', value: `<t:${Math.floor(Date.now() / 1000)}:R>`}]);
        this._sentEmbed.edit({embeds: [newEmbed]});
      }
      this._sentEmbed = null;
      this._embed = null;
      this._lobbyState.status = 'closed';
      this.client?.user?.setActivity({
        name: 'war.trenchguns.com',
        type: Discord.ActivityType.Watching,
      });
    }
  }

  async lobbyClosed() {
    if (this._closingLobby) {
      return;
    }
    this._closingLobby = true;
    if (this._embed && this._sentEmbed) {
      try {
        if (this._lobbyState.status !== 'started' && this._lobbyState.status !== 'closed') {
          const newEmbed = new EmbedBuilder(this._embed.data);
          newEmbed.setDescription('Lobby closed');
          newEmbed.setColor('#36454F');
          newEmbed.setURL(null);
          if (this._embed.data?.fields) newEmbed.setFields(this._embed.data?.fields?.splice(0, 3));
          this._embed = newEmbed;
          newEmbed.addFields([
            {name: 'Lobby Closed', value: `<t:${Math.floor(Date.now() / 1000)}:R>`},
          ]);
          this._sentEmbed.edit({embeds: [newEmbed]});
          if (this._lobbyState.name && !this.settings.values.discord.useThreads)
            this.sendMessage('Lobby left. End of chat for ' + this._lobbyState.name);
        }
      } catch (error) {
        this.warn('Error editing embed', error);
      }
      this._sentEmbed = null;
      this._embed = null;
      this._lobbyState.status = 'closed';
      this.client?.user?.setActivity({
        name: 'war.trenchguns.com',
        type: Discord.ActivityType.Watching,
      });
    }
    if (this._currentThread) {
      this.info('Closing chat thread.');
      try {
        await this._currentThread.setArchived(true, 'Lobby closed');
      } catch (error) {
        this.warn('Error locking lobby thread', error);
      }
      this._currentThread = null;
    }
    this._closingLobby = false;
  }

  private async updateDiscordLobby() {
    if (this._embed && this._sentEmbed && this._lobbyState.status === 'active') {
      if (!this.lobby?.microLobby) {
        return;
      }
      const data = this.lobby.microLobby.exportTeamStructure();
      if (data === this._sentEmbedData) {
        return;
      }
      const now = Date.now();
      if (now - this._lobbyUpdates.lastUpdate > 1000) {
        if (this._lobbyUpdates.updateTimer) {
          clearTimeout(this._lobbyUpdates.updateTimer);
          this._lobbyUpdates.updateTimer = null;
        }
        this._lobbyUpdates.lastUpdate = now;
        const newEmbed = new EmbedBuilder(this._embed.data);
        if (this._embed.data?.fields) newEmbed.setFields(this._embed.data?.fields?.splice(0, 3));
        this._embed = newEmbed;
        Object.entries(data).forEach(([teamName, data]) => {
          const combinedData = data.map(
            data =>
              data.name +
              (data.data.extra && data.data.extra.rating > -1
                ? ': ' +
                  [
                    'Rating: ' +
                      (this.settings.values.elo.hideElo ? 'Hidden' : data.data.extra.rating),
                    'Rank: ' + data.data.extra.rank,
                    'Wins: ' + data.data.extra.wins,
                    'Losses: ' + data.data.extra.losses,
                  ].join('/')
                : '') +
              (data.realPlayer ? `\n<t:${Math.floor(data.data.joinedAt / 1000)}:R>` : ''),
          );
          newEmbed.addFields([{name: teamName, value: combinedData.join('\n') ?? ''}]);
        });
        this._sentEmbed.edit({embeds: [newEmbed]});
      } else {
        // Debounce
        if (!this._lobbyUpdates.updateTimer) {
          this._lobbyUpdates.updateTimer = setTimeout(
            this.updateDiscordLobby.bind(this),
            this._lobbyUpdates.lastUpdate + 1000 - now,
          );
        }
      }
    }
  }

  protected onErrorLog(name: string, ...events: unknown[]): void {
    if (
      (this.settings.values.discord.logLevel === 'error' ||
        this.settings.values.discord.logLevel === 'warn') &&
      this.adminChannel
    ) {
      this.sendMessage(name + ' ERROR: ' + JSON.stringify(events), 'admin');
    }
  }

  protected onWarnLog(name: string, ...events: unknown[]): void {
    if (this.settings.values.discord.logLevel === 'warn' && this.adminChannel) {
      this.sendMessage(name + ' WARN: ' + JSON.stringify(events), 'admin');
    }
  }

  async sendMessage(
    message: string | Discord.MessagePayload | Discord.MessageCreateOptions,
    channel: ChatChannelMatch | 'thread' = 'chat',
  ) {
    if (channel === 'chat' && this.chatChannel) {
      return this.chatChannel.send(message);
    } else if (channel === 'announce' && this.announceChannel) {
      return this.announceChannel.send(message);
    } else if (channel === 'admin' && this.adminChannel) {
      return this.adminChannel.send(message);
    } else if (channel === 'thread' && this._currentThread) {
      return this._currentThread?.send(message);
    } else {
      return null;
    }
  }
}

export const discordBot = new DiscordBot();
