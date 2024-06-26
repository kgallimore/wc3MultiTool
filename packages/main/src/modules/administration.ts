import {ModuleBase} from '../moduleBase';

import type {InferSelectModel} from 'drizzle-orm';
import {eq, sql, and, isNull} from 'drizzle-orm';
import {drizzleClient} from '../drizzle';

import type {MicroLobby, PlayerPayload, Regions, SlotNumbers} from 'wc3mt-lobby-container';
import type {LobbyUpdatesExtended} from './lobbyControl';

import type {GameSocketEvents, AvailableHandicaps} from './../globals/gameSocket';
import type {AdminCommands, AdminRoles, AllRoles} from './../utility';
import {isInt, ensureInt, commands, commandArray, hierarchy} from './../utility';
import type {AutoHostSettings} from './../globals/settings';
import {banList, userList, whiteList, adminList} from '../schema';

export type FetchWhiteBanListSortOptions = 'id' | 'username' | 'admin' | 'region' | 'reason';

export interface FetchListOptions {
  type: 'whiteList' | 'banList';
  page?: number;
  sort?: FetchWhiteBanListSortOptions;
  sortOrder?: 'asc' | 'desc';
  activeOnly?: boolean;
}

class Administration extends ModuleBase {
  constructor() {
    super('Administration', {listeners: ['gameSocketEvent', 'lobbyUpdate']});
  }

  protected async onGameSocketEvent(events: GameSocketEvents): Promise<void> {
    if (events.processedChat) {
      const sender = events.processedChat.sender;
      const firstArg = events.processedChat.content.split(' ')[0];
      if (firstArg.match(/^\?/)) {
        const command = firstArg.slice(1).toLowerCase() as AdminCommands ;
        if (command.match(/^(help)|(commands)/i)) {
          if (this.lobby.microLobby?.lobbyStatic.isHost) {
            if (this.lobby.microLobby?.statsAvailable) {
              this.gameSocket.sendChatMessage(
                '?stats <?player>: Return back your stats, or target player stats',
              );
            }
            if (
              ['rapidHost', 'smartHost'].includes(this.settings.values.autoHost.type)
            ) {
              if(this.settings.values.autoHost.voteStart)
                this.gameSocket.sendChatMessage('?voteStart: Starts or accepts a vote to start');
              if(this.settings.values.autoHost.swapRequests)
                this.gameSocket.sendChatMessage('?swapreq (yes/no/cancel/slot/player): Starts or accepts a vote to swap spots with another player');
            }
            if (await this.checkRole(sender, 'moderator')) {
              commandArray
                .filter(([_, details]) => details.minPermissions === 'moderator')
                .forEach(([command, details]) => {
                  this.gameSocket.sendChatMessage(
                    `?${command}${details.arguments ? ' ' + details.arguments : ''}: ${
                      details.description
                    } `,
                  );
                });
            }
            if (await this.checkRole(sender, 'admin')) {
              commandArray
                .filter(([_, details]) => details.minPermissions === 'admin')
                .forEach(([command, details]) => {
                  this.gameSocket.sendChatMessage(
                    `?${command}${details.arguments ? ' ' + details.arguments : ''}: ${
                      details.description
                    } `,
                  );
                });
            }
            this.gameSocket.sendChatMessage(
              '?help: Shows commands with <required arg> <?optional arg>',
            );
          }
          return;
        } else if (command in commands) {
          const content = events.processedChat.content.split(' ');
          const role = await this.getRole(sender);
          if (role) {
            const runCom = await this.runCommand(command, role, sender, content.slice(1));
            if (runCom) {
              this.gameSocket.sendChatMessage(runCom);
            }
          }
          return;
        }
      }
      this.gameSocket.emitEvent({nonAdminChat: events.processedChat});
    }
  }

  public async runCommand(
    command: AdminCommands,
    role: AllRoles,
    user: string,
    args?: string[],
  ): Promise<string | false> {
    let retString = '';
    if (!commands[command]) {
      return false;
    }
    if (!this.roleEqualOrHigher(role, commands[command].minPermissions))
      return 'Insufficient permissions.';
    if (commands[command].requiresHost && !this.lobby.microLobby?.lobbyStatic.isHost)
      return 'Client must be host for this command';
    if (commands[command].requiresLobby && !this.lobby.microLobby) {
      return 'Client must be in a lobby for this command';
    } else {
      this.lobby.microLobby = this.lobby.microLobby as MicroLobby;
    }
    switch (command as AdminCommands | true) {
      case 'sp':
        this.lobby.shufflePlayers();
        break;
      case 'st':
        this.lobby.shufflePlayers(false);
        break;
      case 'start':
        this.lobby.startGame();
        break;
      case 'a':
        this.gameSocket.cancelStart();
        break;
      case 'closeall':
        this.gameSocket.sendChatMessage('!closeall');
        break;
      case 'hold':
        if (args?.[0]) {
          this.gameSocket.sendChatMessage('!hold ' + args?.[0]);
        } else {
          retString = 'Player target required.';
        }

        break;
      case 'mute':
        if (args?.[0]) {
          this.gameSocket.sendChatMessage('!mute ' + args?.[0]);
          this.info(user + ' muted ' + args?.[0]);
        } else {
          retString = 'Player target required.';
        }

        break;
      case 'unmute':
        if (args?.[0]) {
          this.gameSocket.sendChatMessage('!unmute ' + args?.[0]);
          this.info(user + ' unmuted ' + args?.[0]);
        } else {
          retString = 'Player target required.';
        }

        break;
      case 'openall':
        this.gameSocket.sendChatMessage('!openall');
        break;
      case 'swap':
        if (args && args.length === 2) {
          const playerData = this.lobby.microLobby?.getAllPlayerData();
          const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
          if (isInt(args[1], 24, 1) && isInt(args[0], 24, 1)) {
            if (
              this.roleEqualOrHigher(role, 'swapper') ||
              (playerData[this.lobby.microLobby?.slots[parseInt(args[0]) - 1].name].joinedAt >
                tenMinutesAgo &&
                playerData[this.lobby.microLobby?.slots[parseInt(args[1]) - 1].name].joinedAt >
                  tenMinutesAgo)
            ) {
              this.lobby.swapPlayers({
                slots: [ensureInt(args[0]) as SlotNumbers, ensureInt(args[1]) as SlotNumbers],
              });
            } else {
              retString = 'You can only swap players who joined within the last 10 minutes.';
            }
          } else if (
            this.lobby.microLobby?.searchPlayer(args[1]).length === 1 &&
            this.lobby.microLobby?.searchPlayer(args[0]).length === 1
          ) {
            if (
              this.roleEqualOrHigher(role, 'swapper') ||
              (playerData[this.lobby.microLobby?.searchPlayer(args[1])[0]].joinedAt >
                tenMinutesAgo &&
                playerData[this.lobby.microLobby?.searchPlayer(args[0])[0]].joinedAt >
                  tenMinutesAgo)
            ) {
              this.lobby.swapPlayers({players: [args[0], args[1]]});
            } else {
              retString = 'You can only swap players who joined within the last 10 minutes.';
            }
          } else {
            retString = 'All swap players not found, or too many matches.';
          }
        } else {
          retString = 'Invalid swap arguments';
        }

        break;
      case 'handi':
        if (args?.length === 2) {
          const target = args[0];
          // TODO check handicaps
          const handicap = parseInt(args[1]) as AvailableHandicaps;
          if (isInt(target, 24, 1)) {
            if (handicap) {
              this.lobby.setHandicapSlot(parseInt(target) - 1, handicap);
            } else {
              this.lobby.setPlayerHandicap(target, handicap);
            }
          } else {
            retString = 'Invalid handicap';
          }
        } else {
          retString = 'Invalid number of arguments';
        }

        break;
      case 'close':
        if (args && args.length > 0) {
          const target = args[0];
          if (isInt(target, 24, 1)) {
            this.lobby.closeSlot(parseInt(target) - 1);
          } else {
            const targets = this.lobby.microLobby?.searchPlayer(target);
            if (targets.length === 1) {
              this.lobby.closePlayer(targets[0]);
            } else if (targets.length > 1) {
              retString = 'Multiple matches found. Please be more specific.';
            } else {
              retString = 'No matches found.';
            }
          }
        } else {
          retString = 'Kick target required';
        }

        break;
      case 'open':
        if (args && args.length > 0) {
          const target = args[0];
          if (isInt(target, 24, 1)) {
            this.lobby.openSlot(parseInt(target) - 1);
          } else {
            const targets = this.lobby.microLobby?.searchPlayer(target);
            if (targets.length === 1) {
              this.lobby.kickPlayer(targets[0]);
            } else if (targets.length > 1) {
              retString = 'Multiple matches found. Please be more specific.';
            } else {
              retString = 'No matches found.';
            }
          }
        } else {
          retString = 'Open target required';
        }

        break;
      case 'kick':
        if (args && args.length > 0) {
          const target = args[0];
          if (isInt(target, 24, 1)) {
            this.lobby.kickSlot(parseInt(target) - 1);
          } else {
            const targets = this.lobby.microLobby?.searchPlayer(target);
            if (targets.length === 1) {
              this.lobby.kickPlayer(targets[0]);
            } else if (targets.length > 1) {
              retString = 'Multiple matches found. Please be more specific.';
            } else {
              retString = 'No matches found.';
            }
          }
        } else {
          retString = 'Kick target required';
        }

        break;
      case 'balance':
        this.lobby.autoBalance();
        break;
      case 'ban':
        if (args && args.length > 0) {
          const target = args[0];
          const reason = args.slice(2).join(' ') || '';
          if (isInt(target, 24, 1)) {
            if (!this.lobby.microLobby) return 'Slot given but no current lobby';
            this.lobby.banSlot(parseInt(target) - 1);
            this.banPlayer(
              this.lobby.microLobby?.slots[target].name,
              user,
              this.lobby.microLobby?.region,
              reason,
            );
          } else {
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              retString = 'Banning out of lobby player.';
              this.banPlayer(target, user, this.lobby.microLobby?.region, reason);
            } else {
              const targets = this.lobby.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.banPlayer(targets[0], user, this.lobby.microLobby?.region, reason);
              } else if (targets.length > 1) {
                retString = 'Multiple matches found. Please be more specific.';
              } else {
                retString = 'No matches found.';
              }
            }
          }
        } else {
          retString = 'Target required';
        }

        break;
      case 'unban':
        if (args && args.length > 0) {
          const target = args[0];
          if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
            retString = 'Unbanning out of lobby player.';
            this.unBanPlayer(target, user);
          } else {
            retString = 'Full battleTag required';
            this.info('Full battleTag required');
          }
        } else {
          retString = 'Ban target required';
          this.info('Ban target required');
        }

        break;
      case 'white':
        if (args && args.length > 0) {
          const target = args[0];
          const reason = args.slice(2).join(' ') || '';
          if (isInt(target, 24, 1)) {
            this.whitePlayer(
              this.lobby.microLobby?.slots[target].name,
              user,
              this.lobby.microLobby?.region,
              reason,
            );
          } else {
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              retString = 'Whitelisting out of lobby player.';
              this.whitePlayer(target, user, this.lobby.microLobby?.region, reason);
            } else {
              const targets = this.lobby.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.whitePlayer(targets[0], user, this.lobby.microLobby?.region, reason);
              } else if (targets.length > 1) {
                retString = 'Multiple matches found. Please be more specific.';
              } else {
                retString = 'No matches found.';
              }
            }
          }
        } else {
          retString = 'Target required';
        }

        break;
      case 'unwhite':
        if (args && args.length > 0) {
          const target = args[0];
          if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
            retString = 'Un-whitelisting out of lobby player.';
            this.unWhitePlayer(target, user);
          } else {
            retString = 'Full battleTag required';
            this.info('Full battleTag required');
          }
        } else {
          retString = 'Un-whitelist target required';
          this.info('Un-whitelist target required');
        }

        break;
      case 'perm':
        if (args && args.length > 0) {
          const target = args[0];
          let perm: 'mod' | AdminRoles =
            (args[1]?.toLowerCase() as null | 'baswapper' | 'swapper' | 'moderator' | 'admin') ??
            'mod';
          perm = perm === 'mod' ? 'moderator' : perm;
          if (['baswapper', 'swapper', 'moderator', 'admin'].includes(perm)) {
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              retString = 'Assigning out of lobby player ' + perm + '.';
              await this.addAdmin(target, user, this.lobby.microLobby?.region, perm);
            } else {
              const targets = this.lobby.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                if (
                  (await this.addAdmin(targets[0], user, this.lobby.microLobby?.region, perm)) ===
                  true
                ) {
                  retString = targets[0] + ' has been promoted to ' + perm + '.';
                } else {
                  retString = 'Could not promote ' + targets[0] + ' to ' + perm + '.';
                }
              } else if (targets.length > 1) {
                retString = 'Multiple matches found. Please be more specific.';
              } else {
                retString = 'No matches found.';
              }
            }
          } else {
            retString = 'Invalid permission';
          }
        } else {
          retString = 'Target required';
        }

        break;
      case 'unperm':
        if (args && args.length > 0) {
          const target = args[0];
          if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
            if (await this.removeAdmin(target, user)) {
              retString = 'Removed perm from out of lobby player: ' + target;
            } else {
              retString = 'Could not remove perm from out of lobby player: ' + target;
            }
          } else {
            const targets = this.lobby.microLobby?.searchPlayer(target);
            if (targets.length === 1) {
              if (await this.removeAdmin(targets[0], user)) {
                retString = targets[0] + ' has been demoted.';
              } else {
                retString = targets[0] + ' has no permissions.';
              }
            } else if (targets.length > 1) {
              retString = 'Multiple matches found. Please be more specific.';
            } else {
              retString = 'No matches found.';
            }
          }
        } else {
          retString = 'Target required';
        }

        break;
      case 'autohost':
        if (args && args.length > 0) {
          let target = args[0];
          target = target.toLowerCase();
          if (['off', 'rapid', 'lobby', 'smart'].includes(target)) {
            if (target !== 'off') {
              target += 'Host';
            }
            retString = 'Setting autohost type to: ' + target;
            this.settings.updateSettings({
              autoHost: {type: target as AutoHostSettings['type']},
            });
          } else {
            retString = 'Invalid autohost type';
          }
        } else {
          retString = 'Autohost current type: ' + this.settings.values.autoHost.type;
        }

        break;
      case 'autostart':
        if (args && args.length > 0) {
          const target = args[0];
          if (isInt(target, 24, 0)) {
            const startTarget = parseInt(target);
            retString = 'Setting autostart number to: ' + startTarget.toString();
            if (this.settings.values.autoHost.type === 'off') {
              retString = 'Autohost must be enabled to autostart.';
            }
            this.settings.updateSettings({autoHost: {minPlayers: startTarget}});
          } else {
            retString = 'Invalid autostart number';
          }
        } else {
          retString = 'Autostart current number: ' + this.settings.values.autoHost.minPlayers;
        }

        break;

      default:
        return false;
    }
    return retString;
  }

  protected onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    if (updates.playerJoined) {
      if (updates.playerJoined.name) {
        this.clearPlayer(updates.playerJoined);
      } else {
        this.warn('Nameless player joined');
      }
    }
    if (updates.newLobby) {
      this.info('Entered new lobby');
      Object.values(updates.newLobby.slots)
        .filter(slot => slot.slotStatus === 2 && (slot.playerRegion || slot.isSelf))
        .forEach(slot => {
          this.clearPlayer(slot);
        });
    }
  }

  async clearPlayer(data: PlayerPayload) {
    this.verbose('Checking if player is clear: ' + data.name);
    const findplayer = await drizzleClient.query.userList.findFirst({
      where: item => eq(item.name, data.name),
    });
    if (!findplayer) {
      await drizzleClient.insert(userList).values({name: data.name});
    }
    const isClear = await this.checkPlayer(data.name);
    if (!isClear.type) {
      this.lobby.clearPlayer(data.name, true);
      this.info('Cleared ' + data.name);
      return;
    }
    this.lobby.banSlot(data.slot);
    if (isClear.type === 'black') {
      this.gameSocket.sendChatMessage(
        data.name + ' is permanently banned' + (isClear.reason ? ': ' + isClear.reason : ''),
      );
      this.info('Kicked ' + data.name + ' for being banned' + (isClear ? ' for: ' + isClear : ''));
      return;
    }
    if (isClear.type === 'white') {
      this.lobby.banSlot(data.slot);
      this.gameSocket.sendChatMessage(data.name + ' is not whitelisted');
      this.info('Kicked ' + data.name + ' for not being whitelisted');
      return;
    }
  }

  async checkPlayer(
    name: string,
  ): Promise<{type: 'black' | 'white' | false; reason?: string | null}> {
    const row = await this.isBanned(name);
    if (row) {
      return {type: 'black', reason: row.reason};
    }
    if (this.settings.values.autoHost.whitelist) {
      const isPrivileged = await this.checkRole(name, 'swapper');
      const whiteListed = await this.isWhiteListed(name);
      if (!isPrivileged && name !== this.gameState.values.selfBattleTag && !whiteListed) {
        return {type: 'white'};
      }
    }
    return {type: false};
  }

  async banPlayer(
    player: string,
    admin: string,
    region: Regions | 'client' | '',
    reason = '',
    bypassCheck: boolean = false,
  ): Promise<true | {reason: string}> {
    if ((await this.checkRole(admin, 'moderator')) || bypassCheck) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        if (await this.checkRole(player, 'admin')) {
          this.warn('Can not ban an admin (' + player + ') without removing permissions first.');
          return {reason: 'Can not ban an admin without removing permissions first.'};
        }
        //const newBan = new BanList({ username: player, admin, region, reason });
        const findUser = await drizzleClient.query.banList.findFirst({
          where: item => eq(item.username, player),
        });
        if (!findUser) await drizzleClient.insert(userList).values({name: player});
        await drizzleClient.insert(banList).values({username: player, admin, region, reason});

        this.info('Banned ' + player + ' by ' + admin + (reason ? ' for ' + reason : ''));
        this.sendWindow({
          legacy: {
            messageType: 'action',
            data: {
              value: 'Banned ' + player + ' by ' + admin + (reason ? ' for ' + reason : ''),
            },
          },
        });
        if (this.lobby.microLobby?.allPlayers.includes(player)) {
          this.lobby.banPlayer(player);
          this.gameSocket.sendChatMessage(player + ' banned' + (reason ? ' for ' + reason : ''));
        }
        return true;
      } else {
        this.error('Failed to ban, invalid battleTag: ' + player);
        return {reason: 'Failed to ban, invalid battleTag: ' + player};
      }
    } else {
      this.info('Failed to ban ' + player + ' by ' + admin + ': Missing required permissions.');
    }

    return {reason: 'Missing required permissions.'};
  }

  async whitePlayer(
    player: string,
    admin: string,
    region: Regions | 'client',
    reason = '',
    bypassCheck: boolean = false,
  ): Promise<true | {reason: string}> {
    if ((await this.checkRole(admin, 'moderator')) || bypassCheck) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        const findUser = await drizzleClient.query.whiteList.findFirst({
          where: item => eq(item.username, player),
        });
        if (!findUser) await drizzleClient.insert(userList).values({name: player});
        await drizzleClient.insert(whiteList).values({username: player, admin, region, reason});
        this.info('Whitelisted ' + player + ' by ' + admin + (reason ? ' for ' + reason : ''));
        this.sendWindow({
          legacy: {
            messageType: 'action',
            data: {
              value: 'Whitelisted ' + player + ' by ' + admin + (reason ? ' for ' + reason : ''),
            },
          },
        });
        if (this.lobby.microLobby?.allPlayers.includes(player)) {
          this.gameSocket.sendChatMessage(
            player + ' whitelisted' + (reason ? ' for ' + reason : ''),
          );
        }
        return true;
      } else {
        this.error('Failed to whitelist, invalid battleTag: ' + player);
        return {reason: 'Invalid battleTag'};
      }
    }
    return {reason: 'Missing required permissions'};
  }

  async unWhitePlayer(player: string, admin: string): Promise<true | {reason: string}> {
    try {
      if (!(await this.checkRole(admin, 'moderator'))) {
        return {reason: 'Missing required permissions'};
      }
      await drizzleClient
        .update(whiteList)
        .set({removalDate: sql`(CURRENT_TIMESTAMP)`})
        .where(eq(whiteList.username, player));
      this.info('Un-whitelisted ' + player + ' by ' + admin);
      this.sendWindow({
        legacy: {
          messageType: 'action',
          data: {value: 'Un-whitelisted ' + player + ' by ' + admin},
        },
      });
      return true;
    } catch (err) {
      this.error('Failed to un-whitelist ' + player + ' by ' + admin, err);
      return {reason: 'Failed to un-whitelist ' + player + ' by ' + admin};
    }
  }

  async unBanPlayer(player: string, admin: string): Promise<true | {reason: string}> {
    try {
      if (!(await this.checkRole(admin, 'moderator'))) {
        return {reason: 'Missing required permissions'};
      }
      await drizzleClient
        .update(banList)
        .set({removalDate: sql`(CURRENT_TIMESTAMP)`})
        .where(and(eq(banList.username, player), isNull(banList.removalDate)));

      this.info('Unbanned ' + player + ' by ' + admin);
      this.sendWindow({
        legacy: {
          messageType: 'action',
          data: {value: 'Unbanned ' + player + ' by ' + admin},
        },
      });
      return true;
    } catch (err) {
      this.error('Failed to unban ' + player + ' by ' + admin, err);
      return {reason: 'Failed to unban ' + player + ' by ' + admin};
    }
  }

  async addAdmin(
    player: string,
    admin: string,
    region: Regions | 'client',
    role: AdminRoles = 'moderator',
    bypassCheck: boolean = false,
  ): Promise<{reason: string} | true> {
    if ((await this.checkRole(admin, 'admin')) || bypassCheck) {
      if (['baswapper', 'swapper', 'moderator', 'admin'].includes(role)) {
        if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
          if (await this.checkRole(player, 'moderator')) {
            try {
              const findUser = await drizzleClient.query.userList.findFirst({
                where: item => eq(item.name, player),
              });
              if (!findUser) {
                await drizzleClient.insert(userList).values({name: player});
              }
              await drizzleClient
                .update(adminList)
                .set({role, admin, region})
                .where(eq(adminList.username, player));
              this.info('Updated ' + player + ' to ' + role + ' by ' + admin);
              this.sendWindow({
                legacy: {
                  messageType: 'action',
                  data: {
                    value: 'Updated ' + player + ' to ' + role + ' by ' + admin,
                  },
                },
              });
              return true;
            } catch (err) {
              this.error('Failed to update ' + player + ' to ' + role + ' by ' + admin, err);
              return {reason: 'Database error'};
            }
          } else {
            try {
              await drizzleClient.insert(adminList).values({username: player, admin, region, role});
              this.info('Added ' + player + ' to ' + role + ' by ' + admin);
              this.sendWindow({
                legacy: {
                  messageType: 'action',
                  data: {
                    value: 'Added ' + player + ' to ' + role + ' by ' + admin,
                  },
                },
              });
              return true;
            } catch (err) {
              this.error('Failed to add ' + player + ' to ' + role + ' by ' + admin, err);
              return {reason: 'Database error'};
            }
          }
        } else {
          this.info('Failed to add admin, invalid battleTag: ' + player);
          return {reason: 'Invalid battleTag'};
        }
      } else {
        this.info('Failed to add admin, invalid role: ' + role);
        return {reason: 'Invalid role'};
      }
    } else {
      this.info(admin + ' is not an admin and can not set perms.');
      return {reason: 'Missing required permissions'};
    }
  }

  async removeAdmin(
    player: string,
    admin: string,
    bypassCheck: boolean = false,
  ): Promise<{reason: string} | undefined> {
    if ((await this.checkRole(admin, 'admin')) || bypassCheck) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        if (await this.checkRole(player, 'baswapper')) {
          await drizzleClient.delete(adminList).where(eq(adminList.username, player));
          this.info('Removed permissions from ' + player);
          this.sendWindow({
            legacy: {
              messageType: 'action',
              data: {value: 'Removed permissions from ' + player},
            },
          });
        } else {
          this.info(player + ' is not a moderator');
          return {reason: 'Target has no roles.'};
        }
      } else {
        this.error('Failed to remove admin, invalid battleTag: ' + player);
        return {reason: 'Invalid battleTag'};
      }
    }
    return {reason: 'Missing required permissions'};
  }

  async getRole(player: string): Promise<AdminRoles | null> {
    if (
      player === this.gameState.values.selfBattleTag ||
      player === 'client' ||
      (player === 'Trenchguns#1800' && this.settings.values.client.debugAssistance)
    )
      return 'admin';
    const row = await drizzleClient.query.adminList.findFirst({
      where: item => eq(item.username, player),
    });
    return (row?.role as AdminRoles) ?? null;
  }

  async checkRole(player: string, minPerms: AdminRoles): Promise<boolean> {
    if (!player) return false;
    if (player === 'client') return true;
    const usersRole = await this.getRole(player);
    if (usersRole) {
      return this.roleEqualOrHigher(usersRole, minPerms);
    }
    return false;
  }

  roleEqualOrHigher(role: AllRoles | 'client', targetPerms: AllRoles): boolean {
    if (!role) return false;
    if (role === 'client' || !targetPerms) return true;
    return hierarchy[role] >= hierarchy[targetPerms];
  }

  async isWhiteListed(player: string): Promise<boolean> {
    const row = drizzleClient.query.whiteList.findFirst({
      where: item => and(eq(item.username, player), isNull(item.removalDate)),
    });
    return !!row;
  }

  async isBanned(player: string): Promise<InferSelectModel<typeof banList> | undefined> {
    const row = drizzleClient.query.banList.findFirst({
      where: item => and(eq(item.username, player), isNull(item.removalDate)),
    });
    return row;
  }

  async fetchList(
    options: FetchListOptions,
  ): Promise<
    InferSelectModel<typeof banList>[] | InferSelectModel<typeof whiteList>[] | undefined
  > {
    const targetTable =
      options.type === 'banList' ? drizzleClient.query.banList : drizzleClient.query.whiteList;
    if (options.activeOnly) {
      return await targetTable.findMany({
        where: isNull(whiteList.removalDate),
        limit: 10,
        offset: options.page !== undefined ? options.page * 10 : 0,
        orderBy: (players, {asc, desc}) => [
          options.sortOrder == 'asc' ? asc(players.id) : desc(players.id),
        ],
      });
    }
    return await targetTable.findMany({
      limit: 10,
      offset: options.page !== undefined ? options.page * 10 : 0,
      orderBy: (players, {asc, desc}) => [
        options.sortOrder == 'asc' ? asc(players.id) : desc(players.id),
      ],
    });
  }
}

export const administration = new Administration();
