import {Module} from '../moduleBasePre';

import type {
  PlayerData,
  PlayerTeamsData,
  GameClientLobbyPayload,
  Regions,
  SlotNumbers,
  TeamTypes,
  LobbyUpdates,
} from 'wc3mt-lobby-container';
import {MicroLobby} from 'wc3mt-lobby-container';
import {generateAutoBalance} from './autoBalancer';
import {ensureInt} from '../utility';
import type {GameSocketEvents, AvailableHandicaps} from './../globals/gameSocket';
import {sleep} from '@nut-tree/nut-js';
import {existsSync, readFile, writeFileSync} from 'fs';
import {app} from 'electron';
import type {EloSettings, SettingsUpdates} from './../globals/settings';

import type {GameState} from './../globals/gameState';

import {Sequelize, QueryTypes} from 'sequelize';
import {join} from 'path';

interface EloMapNameLookups {
  [key: string]: EloMapNameData;
}

interface EloMapNameData {
  regex: string;
  elo: boolean;
  defaultElo: Partial<Record<EloSettings['type'], number>>;
}

export const EloMapNameLookups: EloMapNameLookups = {
  HLW: {regex: 'HLW', elo: true, defaultElo: {wc3stats: 500}},
  'Pyro TD': {
    regex: 'pyro\\s*td\\s*league',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'Vampirism Fire': {
    regex: 'Vampirism\\s*Fire',
    elo: true,
    defaultElo: {wc3stats: 1500},
  },
  'Footmen VsGrunts': {
    regex: 'footmen.*vs.*grunts',
    elo: true,
    defaultElo: {wc3stats: 1000},
  },
  'Broken Alliances': {
    regex: 'Broken.*Alliances',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'Reforged Footmen Frenzy': {
    regex: 'Reforged.*Footmen',
    elo: true,
    defaultElo: {wc3stats: 1500},
  },
  'Direct Strike': {
    regex: 'Direct.*Strike.*Reforged',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'WW3 Diplomacy': {
    regex: 'WW3.*Diplomacy',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'Legion TD': {
    regex: 'Legion.*TD',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'Tree Tag': {
    regex: 'Tree.*Tag',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'Battleships Crossfire': {
    regex: 'Battleships.*Crossfire',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'Risk Europe': {
    regex: 'Risk.*Europe',
    elo: true,
    defaultElo: {wc3stats: 500},
  },
  'Wintermaul Wars': {
    regex: '(WMW|Wintermaul Wars).*X',
    elo: true,
    defaultElo: {wc3stats: 1000},
  },
};

export interface LobbyUpdatesExtended extends LobbyUpdates {
  playerCleared?: string;
  lobbyReady?: true;
  lobbyBalanced?: true;
}
export type SlotInteractions =
  | 'CloseSlot'
  | 'BanPlayerFromGameLobby'
  | 'KickPlayerFromGameLobby'
  | 'OpenSlot';

export function statsToString(stats: PlayerData['extra'], hideElo: boolean = false): string {
  let buildString = '';

  if (!stats) {
    return '';
  }
  const valid: [string, number][] = Object.entries(stats).filter(([_, value]) => value > -1);
  valid.forEach(([key, value]) => {
    if (key === 'rating' && value > -1) {
      buildString += 'ELO: ';
      if (hideElo) {
        buildString += 'Hidden';
      } else {
        buildString += value;
      }
      buildString += ', ';
    } else {
      buildString += key.charAt(0).toUpperCase() + key.substring(1) + ': ' + value + ', ';
    }
  });
  if (buildString) {
    buildString = buildString.substring(0, buildString.length - 2);
  }
  return buildString;
}

export class LobbyControl extends Module {
  private refreshing: boolean = false;
  private staleTimer: NodeJS.Timeout | null = null;

  dbConn: Sequelize | null = null;

  bestCombo: Array<string> | Array<Array<string>> = [];
  microLobby: MicroLobby | null = null;
  eloName: string = '';
  fetchingStats: Array<string> = [];
  leftGame: boolean = false;

  public eloMapNameLookups: EloMapNameLookups = EloMapNameLookups;

  private isTargetMap: boolean = false;

  private startTimer: NodeJS.Timeout | null = null;

  private expectedSwaps: Array<{swaps: [string, string]; forBalance: boolean}> = [];

  eloJsonLocation = join(app.getPath('appData'), 'eloMapNameLookups.json');

  constructor() {
    super('Lobby Control', {
      listeners: ['gameSocketEvent', 'gameStateUpdates', 'settingsUpdate'],
    });
    this.initDatabase();
    if (existsSync(this.eloJsonLocation)) {
      readFile(this.eloJsonLocation, (err, data) => {
        if (err) {
          this.warn('Could not load elo map name lookups from file. Error: ' + err);
        } else if (data) {
          this.eloMapNameLookups = JSON.parse(data.toString());
          this.verbose('Loaded elo map name lookups from file');
        } else {
          this.warn('Could not load elo map name lookups from file, file may be empty.');
        }
        this.fetchEloMapNameLookups();
      });
    } else {
      this.fetchEloMapNameLookups();
    }
    setInterval(() => this.fetchEloMapNameLookups(), 1000 * 60 * 60 * 24);
  }

  async fetchEloMapNameLookups(): Promise<void> {
    if (this.settings.values.elo.eloMapNameLookupURL) {
      this.verbose(
        'Fetching elo map name lookups from: ' + this.settings.values.elo.eloMapNameLookupURL,
      );
      const res = await fetch(this.settings.values.elo.eloMapNameLookupURL, {
        method: 'GET',
        cache: 'no-store',
      });
      if (res.status !== 200) {
        this.error(
          'Could not fetch elo map name lookups from: ' +
            this.settings.values.elo.eloMapNameLookupURL +
            ' Error: ' +
            res.statusText,
        );
        return;
      }
      (res.json() as Promise<EloMapNameLookups>).then(data => {
        const oldEntryKeys = Object.keys(this.eloMapNameLookups);
        const newEntries = Object.entries(data);
        if (oldEntryKeys.length !== newEntries.length) {
          this.updateEloMapNameLookups(data, 'New length');
          return;
        }
        for (const [key, value] of newEntries) {
          if (!this.eloMapNameLookups[key]) {
            this.updateEloMapNameLookups(data, 'New map: ' + key);
            return;
          }
          for (const [key2, value2] of Object.entries(value)) {
            if (typeof this.eloMapNameLookups[key] !== 'object') {
              if (this.eloMapNameLookups[key][key2 as keyof EloMapNameData] !== value2) {
                this.updateEloMapNameLookups(data, `New value: ${key} ${key2} ${value2}`);
                return;
              }
            } else {
              if (
                JSON.stringify(this.eloMapNameLookups[key][key2 as keyof EloMapNameData]) !==
                JSON.stringify(value2)
              ) {
                this.updateEloMapNameLookups(
                  data,
                  `New object value: ${key} ${key2} ${JSON.stringify(value2)}`,
                );
                return;
              }
            }
          }
        }
      });
    }
  }

  updateEloMapNameLookups(newData: EloMapNameLookups, reason?: string) {
    writeFileSync(this.eloJsonLocation, JSON.stringify(newData));
    this.info('Elo map name lookups updated' + (reason ? ': ' + reason : ''));
    this.eloMapNameLookups = newData;
  }

  onSettingsUpdate(updates: SettingsUpdates) {
    if (
      updates.elo?.dbIP !== undefined ||
      updates.elo?.dbName !== undefined ||
      updates.elo?._dbPassword !== undefined ||
      updates.elo?.dbUser !== undefined ||
      updates.elo?.dbPort !== undefined
    ) {
      this.initDatabase();
    }
    if (updates.autoHost?.mapName) {
      this.eloMapName(updates.autoHost.mapName, this.settings.values.elo.type).then(data => {
        this.settings.updateSettings({
          elo: {available: data.elo, lookupName: data.name},
        });
      });
    }
  }

  protected onGameStateUpdate(updates: Partial<GameState>): void {
    if (updates.inGame === false) {
      this.clear();
    }
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.GameLobbySetup && events.GameLobbySetup.teamData.playableSlots > 1) {
      this.ingestLobby(events.GameLobbySetup, this.gameState.values.selfRegion as Regions);
    }
    if (
      events.disconnected ||
      (events.MultiplayerGameLeave && this.gameState.values.menuState !== 'LOADING_SCREEN')
    ) {
      this.clear();
      this.leftGame = true;
    }
    if (events.ChatMessage) {
      if (events.ChatMessage.message.content.match(/^\?stats/)) {
        if (
          this.microLobby?.lobbyStatic?.isHost &&
          this.settings.values.elo.type !== 'off' &&
          this.microLobby?.statsAvailable
        ) {
          let data: false | PlayerData;
          const playerTarget = events.ChatMessage.message.content.split(' ')[1];
          if (playerTarget) {
            const targets = this.microLobby?.searchPlayer(playerTarget);
            if (targets.length === 1) {
              // Set the sender to a the target player. Could use a empty string and ?? instead
              events.ChatMessage.message.sender = targets[0];
              data = this.getPlayerData(events.ChatMessage.message.sender);
            } else if (targets.length > 1) {
              this.gameSocket.sendChatMessage('Multiple players found. Please be more specific.');
              return;
            } else {
              this.gameSocket.sendChatMessage('No player found.');
              return;
            }
          } else {
            data = this.getPlayerData(events.ChatMessage.message.sender);
          }
          if (data) {
            if (!data.extra || data.extra?.rating === -1) {
              this.gameSocket.sendChatMessage('Data pending');
            } else {
              const statsString = statsToString(data.extra, this.settings.values.elo.hideElo);
              this.gameSocket.sendChatMessage(
                events.ChatMessage.message.sender + ' ' + statsString || 'None available',
              );
            }
          } else {
            this.gameSocket.sendChatMessage('No data available or pending?');
          }
        } else {
          this.gameSocket.sendChatMessage('Data not available');
        }
      }
    }
  }

  ingestLobby(payload: GameClientLobbyPayload, region: Regions) {
    if (!this.microLobby || this.microLobby.lobbyStatic.lobbyName !== payload.lobbyName) {
      if (
        payload.players.length > 0 &&
        Object.values(payload.players).find(slot => slot.isSelf) !== undefined &&
        payload.playerHost
      ) {
        this.startTimer = null;
        try {
          this.microLobby = new MicroLobby({
            region,
            payload,
            statsAvailableOverride:
              this.dbConn !== null || this.settings.values.elo.type === 'random',
          });
          if (this.settings.values.elo.type !== 'off') {
            this.eloMapName(payload.mapData.mapName, this.settings.values.elo.type).then(
              eloMapName => {
                this.eloName = eloMapName.name;
                if (eloMapName.elo) {
                  if (this.microLobby) {
                    this.microLobby.statsAvailable = eloMapName.elo;
                  }
                }
              },
            );
          }
          if (
            payload.mapData.mapPath.split(/\/|\\/).slice(-1)[0] !==
            this.settings.values.autoHost.mapPath.split(/\/|\\/).slice(-1)[0]
          ) {
            this.isTargetMap = false;
          } else {
            this.isTargetMap = true;
          }
          if (this.settings.values.autoHost.type !== 'off') {
            this.settings.values.autoHost.closeSlots.forEach(slot => {
              this.closeSlot(slot);
            });
            setTimeout(() => this.moveToSpec(), 150);
          }
          this.emitLobbyUpdate({newLobby: this.microLobby.exportMin()});
        } catch (e) {
          this.error('There was an error creating the microlobby', e);
        }
      }
    } else {
      const changedValues = this.microLobby.updateLobbySlots(payload.players);
      this.verbose('MicroLobby changed values', JSON.stringify(changedValues));
      if (changedValues.playerUpdates.length > 0) {
        this.emitLobbyUpdate({playerPayload: changedValues.playerUpdates});
      }
      if (changedValues.events.isUpdated) {
        let autoBalancedSwap = false;
        let metExpectedSwap = false;
        changedValues.events.events.forEach(event => {
          this.emitLobbyUpdate(event);
          if (event.playerMoved || event.playerJoined) {
            // TODO: only affect player teams
            this.verbose('Player moved or joined');
            this.clearStartTimer();
          } else if (event.playerLeft) {
            this.verbose('Player left: ' + event.playerLeft);
            this.clearStartTimer();
            const player = event.playerLeft;
            const expectedSwapsCheck = this.expectedSwaps.findIndex(swaps =>
              swaps.swaps.includes(player),
            );
            if (expectedSwapsCheck !== -1) {
              this.expectedSwaps = [];
            }
          } else if (event.playersSwapped) {
            const players = event.playersSwapped.players.sort();
            const expectedIndex = this.expectedSwaps.findIndex(
              swap => JSON.stringify(swap.swaps.sort()) === JSON.stringify(players),
            );
            if (expectedIndex !== -1) {
              if (this.expectedSwaps[expectedIndex].forBalance) {
                autoBalancedSwap = true;
              }
              this.expectedSwaps.splice(expectedIndex, 1);
              this.verbose(`Expected swap met for ${players.toString()}`);
              metExpectedSwap = true;
            } else {
              this.verbose('Unexpected player swapped, start canceled.');
              this.clearStartTimer();
            }
          }
        });
        if (this.staleTimer) {
          clearTimeout(this.staleTimer);
        }
        this.staleTimer = setInterval(() => {
          this.staleLobby();
        }, 1000 * 60 * 15);
        if (!metExpectedSwap) {
          this.bestCombo = [];
          if (this.isLobbyReady()) {
            this.emitLobbyUpdate({lobbyReady: true});
          }
        } else if (this.expectedSwaps.length === 0 && autoBalancedSwap) {
          {
            this.info('All expected swaps met. Players should now be balanced.');
            this.gameSocket.sendChatMessage(
              'ELO data provided by: ' + this.settings.values.elo.type,
            );
            this.emitLobbyUpdate({lobbyBalanced: true});
          }
        }
      }
    }
  }

  moveToSpec() {
    if (this.microLobby && this.settings.values.autoHost.moveToSpec) {
      const lobby = this.microLobby;
      const teams = Object.entries(this.microLobby.teamListLookup);
      const specTeams = Object.entries(this.microLobby.teamListLookup).filter(
        ([_, teamData]) => teamData.type === 'specTeams',
      );
      const selfSlot = this.microLobby.getSelfSlot();
      if (selfSlot !== false) {
        let target: [string, {type: TeamTypes; name?: string}] | undefined;
        if (this.settings.values.autoHost.moveToTeam) {
          target = teams.find(([_, teamData]) =>
            teamData.name?.match(new RegExp(this.settings.values.autoHost.moveToTeam, 'i')),
          );
          if (!target) {
            this.error('Could not find target team to move to');
            return;
          } else {
            this.info(`Found target team, moving to team ${target[0]}: ${target[1].name}`);
          }
        }
        if (!target && specTeams.length > 0) {
          target =
            specTeams.find(
              ([teamNumber, teamData]) =>
                teamData.name?.match(/host/i) &&
                Object.values(lobby.slots).find(
                  player => player.team === ensureInt(teamNumber) && player.slotStatus === 0,
                ),
            ) ??
            specTeams.find(([teamNumber, _]) =>
              Object.values(lobby.slots).find(
                player => player.team === ensureInt(teamNumber) && player.slotStatus === 0,
              ),
            );
        } else {
          this.info('There are no available spec teams');
        }
        if (target) {
          this.info('Found spec slot to move to: ' + target[0]);
          this.gameSocket.sendMessage({
            SetTeam: {
              slot: selfSlot,
              team: ensureInt(target[0]),
            },
          });
          if (this.settings.values.autoHost.closeSlots.includes(selfSlot)) {
            setTimeout(() => {
              this.closeSlot(selfSlot);
            }, 250);
          }
        } else {
          this.info('No available spec team found');
        }
      } else {
        this.error('Could not find self slot');
      }
    }
  }

  clear() {
    this.verbose('Clearing lobby.');
    this.bestCombo = [];
    this.refreshing = false;
    if (this.staleTimer) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
    this.microLobby = null;
    this.emitLobbyUpdate({leftLobby: true});
  }

  async eloMapName(
    mapName: string,
    type: EloSettings['type'],
  ): Promise<{name: string; elo: boolean}> {
    let retValue: {name: string; elo: boolean} | undefined;
    for (const [name, data] of Object.entries(this.eloMapNameLookups)) {
      if (mapName.match(new RegExp(data.regex, 'i'))) {
        this.verbose(`Found elo map name match: ${name}`);
        retValue = {name: name, elo: data.elo};
        break;
      }
    }
    if (type === 'wc3stats') {
      if (retValue) {
        retValue.name = encodeURI(retValue.name);
        return retValue;
      }
      const name = encodeURI(mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, ''));
      const test = await (await fetch(`https://api.wc3stats.com/maps/${name}`)).json();
      return {name, elo: test.status === 'ok'};
    }
    if (retValue) {
      return retValue;
    }
    return {
      name: encodeURI(mapName.trim().replace(/\s*v?\.?(\d+\.)?(\*|\d+)\w*\s*$/gi, '')),
      elo: ['mariadb', 'mysql', 'sqlite', 'random'].includes(type),
    };
  }

  async fetchStats(name: string) {
    if (this.settings.values.elo.type !== 'off') {
      try {
        if (!this.eloName) {
          this.info('Waiting for lookup name');
          setTimeout(() => {
            this.fetchStats(name);
          }, 1000);
          return;
        }
        if (this.microLobby?.statsAvailable) {
          this.verbose('Starting search for stats for: ' + name);
          this.fetchingStats.push(name);
          let data: PlayerData['extra'] | undefined;
          if (this.settings.values.elo.type === 'wc3stats') {
            let buildVariant = '';
            if (this.isTargetMap && this.settings.values.elo.wc3StatsVariant) {
              for (const [key, value] of Object.entries(
                JSON.parse(this.settings.values.elo.wc3StatsVariant),
              )) {
                if (value) buildVariant += '&' + key + '=' + value;
              }
            }
            buildVariant = encodeURI(buildVariant);
            const targetUrl = `https://api.wc3stats.com/leaderboard&map=${
              this.eloName
            }${buildVariant}&search=${encodeURI(name)}`;
            this.info(targetUrl);
            let jsonData: {body: Array<PlayerData['extra'] & {name: string}>};
            try {
              jsonData = await (await fetch(targetUrl)).json();
            } catch (e) {
              this.error('Failed to fetch wc3stats data:', e as string);
              jsonData = {body: []};
            }
            const elo = this.eloMapNameLookups[decodeURI(this.eloName)]?.defaultElo.wc3stats ?? 500;
            if (jsonData.body.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const {name, ...desiredData} = jsonData.body[0];
              data = {...desiredData};
            }
            data = data ?? {
              played: 0,
              wins: 0,
              losses: 0,
              rating: elo,
              lastChange: 0,
              rank: 99999,
            };
          } else if (this.settings.values.elo.type === 'random') {
            this.info('Generating random stats for: ' + name);
            const played = Math.round(Math.random() * 100);
            const wins = Math.floor(Math.random() * played);
            data = {
              played: played,
              wins: wins,
              losses: played - wins,
              rating: Math.round(Math.random() * 1000),
              lastChange: Math.floor(Math.random() * 10),
              rank: Math.floor(Math.random() * 1000 + 1),
            };
          } else if (['mariadb', 'mysql', 'sqlite'].includes(this.settings.values.elo.type)) {
            if (!this.dbConn) {
              this.error('Please fix the database connection.');
              return;
            }
            if (!this.settings.values.elo.dbTableName) {
              this.error('No user table set.');
              return;
            }
            if (!this.settings.values.elo.dbUserColumn) {
              this.error('No user name column set.');
              return;
            }
            if (!this.settings.values.elo.dbELOColumn) {
              this.error('No ELO/rating column set.');
              return;
            }
            let buildAlias: string = '';
            if (this.settings.values.elo.dbELOColumn !== 'rating') {
              buildAlias += ` ${this.settings.values.elo.dbELOColumn} as`;
            }
            buildAlias += ' rating';
            if (this.settings.values.elo.dbPlayedColumn) {
              buildAlias += ',';
              if (this.settings.values.elo.dbPlayedColumn !== 'played') {
                buildAlias += ` ${this.settings.values.elo.dbPlayedColumn} as`;
              }
              buildAlias += ' played';
            }
            if (this.settings.values.elo.dbLastChangeColumn) {
              buildAlias += ',';
              if (this.settings.values.elo.dbLastChangeColumn !== 'lastChange') {
                buildAlias += ` ${this.settings.values.elo.dbLastChangeColumn} as`;
              }
              buildAlias += ' lastChange';
            }
            if (this.settings.values.elo.dbWonColumn) {
              buildAlias += ',';
              if (this.settings.values.elo.dbWonColumn !== 'wins') {
                buildAlias += ` ${this.settings.values.elo.dbWonColumn} as`;
              }
              buildAlias += ' wins';
            }
            if (this.settings.values.elo.dbRankColumn) {
              buildAlias += ',';
              if (this.settings.values.elo.dbRankColumn !== 'rank') {
                buildAlias += ` ${this.settings.values.elo.dbRankColumn} as`;
              }
              buildAlias += ' rank';
            }

            let buildJoin = '';
            if (
              this.settings.values.elo.dbSecondaryTable &&
              this.settings.values.elo.dbSecondaryTableKey &&
              this.settings.values.elo.dbPrimaryTableKey
            ) {
              buildJoin = `JOIN ${this.settings.values.elo.dbSecondaryTable} ON ${this.settings.values.elo.dbSecondaryTable}.${this.settings.values.elo.dbSecondaryTableKey}=${this.settings.values.elo.dbTableName}.${this.settings.values.elo.dbPrimaryTableKey}`;
            }

            let buildSeason = '';
            const replacements: {playerName: string; currentSeason?: string} = {
              playerName: name,
            };
            if (this.settings.values.elo.dbSeasonColumn) {
              if (this.settings.values.elo.dbCurrentSeason) {
                buildSeason = ` AND \`${this.settings.values.elo.dbSeasonColumn}\` = :currentSeason`;
                replacements.currentSeason = this.settings.values.elo.dbCurrentSeason;
              } else {
                buildSeason = ` ORDER BY \`${this.settings.values.elo.dbSeasonColumn}\` DESC`;
              }
            }
            const query = `SELECT ${buildAlias} FROM \`${this.settings.values.elo.dbTableName}\` ${buildJoin} WHERE \`${this.settings.values.elo.dbUserColumn}\` = :playerName ${buildSeason}`;
            this.info('Query: ' + query);
            const userFetch = (await this.dbConn.query(query, {
              replacements,
              type: QueryTypes.SELECT,
            })) as
              | {
                  rating: number;
                  played?: number;
                  wins?: number;
                  losses?: number;
                  lastChange?: number;
                  rank?: number;
                }[]
              | null;
            if (userFetch === null || userFetch.length === 0) {
              data = {
                played: 0,
                wins: 0,
                losses: 0,
                rating: this.settings.values.elo.dbDefaultElo,
                lastChange: 0,
                rank: 99999,
              };
            } else {
              const user = userFetch[0];
              data = {
                played: user.played ?? -1,
                wins: user.wins ?? -1,
                losses: user.played && user.wins ? user.played - user.wins : -1,
                rating: Math.round(user.rating),
                lastChange: user.lastChange ?? 0,
                rank: user.rank ?? -1,
              };
            }
          } else {
            this.error('Unknown elo type: ' + this.settings.values.elo.type);
            return;
          }
          const indexOfName = this.fetchingStats.indexOf(name);
          if (indexOfName > -1) {
            this.fetchingStats.splice(indexOfName);
          }
          if (!this.microLobby.allPlayers.includes(name)) {
            // If they left, ignore the rest.
            this.info('Player left: ' + name + ' before stats were fetched.');
            return;
          }
          if (this.settings.values.elo.requireStats) {
            if (data.played !== undefined && data.played < this.settings.values.elo.minGames) {
              this.info(`${name} has not played enough games to qualify for the ladder.`);
              this.gameSocket.sendChatMessage(
                `${name} has not played enough games to qualify for the ladder.`,
              );
              this.banPlayer(name);
              return;
            } else if (
              data.rating !== undefined &&
              data.rating < this.settings.values.elo.minRating
            ) {
              this.info(`${name} has an ELO rating below the minimum.`);
              this.gameSocket.sendChatMessage(`${name} has an ELO rating below the minimum.`);
              this.banPlayer(name);
              return;
            } else if (
              this.settings.values.elo.minRank !== 0 &&
              data.rank !== undefined &&
              data.rank < this.settings.values.elo.minRank
            ) {
              this.info(`${name} has a rank below the minimum.`);
              this.gameSocket.sendChatMessage(`${name} has a rank below the minimum.`);
              this.banPlayer(name);
              return;
            } else if (data.wins !== undefined && data.wins < this.settings.values.elo.minWins) {
              this.info(`${name} has not won enough games to qualify for the ladder.`);
              this.gameSocket.sendChatMessage(
                `${name} has not won enough games to qualify for the ladder.`,
              );
              this.banPlayer(name);
              return;
            }
          }
          if (this.microLobby.ingestUpdate({playerData: {name, extraData: data}}).isUpdated) {
            this.emitLobbyUpdate({
              playerData: {
                extraData: data,
                name,
              },
            });
            this.info(name + ' stats received and saved.');
            if (this.isLobbyReady()) {
              this.emitLobbyUpdate({lobbyReady: true});
            }
          }
        }
      } catch (err: unknown) {
        console.trace();
        this.error('Failed to fetch stats:');
        this.error(err);
      }
    }
  }

  staleLobby() {
    if (this.microLobby && this.microLobby.allPlayers.length < 2) {
      this.info('Try to refresh possibly stale lobby');
      this.emitLobbyUpdate({stale: true});
    } else {
      this.info('Refreshing possibly stale lobby');
      this.refreshGame();
    }
  }

  refreshGame() {
    if (this.microLobby?.lobbyStatic?.isHost) {
      this.refreshing = true;
      const targetSlots = Object.values(this.microLobby.slots)
        .filter(slot => slot.slotStatus === 0)
        .map(slot => slot.slot);
      for (const slot of targetSlots) {
        this.closeSlot(slot);
      }
      for (const slot of targetSlots) {
        this.openSlot(slot);
      }
      setTimeout(() => (this.refreshing = false), 150);
    }
  }

  clearPlayer(name: string, fetchStats = false) {
    if (this.microLobby?.allPlayers.includes(name)) {
      if (this.microLobby.ingestUpdate({playerData: {name, data: {cleared: true}}}).isUpdated) {
        this.verbose('Player cleared: ' + name);
        this.emitLobbyUpdate({playerCleared: name});
        if (fetchStats) {
          this.fetchStats(name);
        }
      } else {
        this.warn('Tried clearing already cleared player.');
      }
    } else {
      this.warn('Tried clearing nonexistent player');
    }
  }

  clearStartTimer() {
    if (this.startTimer) {
      this.gameSocket.sendChatMessage('Lobby start was cancelled');
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
  }

  startGame(delay: number = 0) {
    if (delay > 0) {
      if (this.startTimer) {
        this.gameSocket.sendChatMessage('Lobby changed. Starting game in ' + delay + ' second(s)!');
      } else {
        this.gameSocket.sendChatMessage('Starting game in ' + delay + ' second(s)!');
      }
    }
    if (this.startTimer) {
      clearTimeout(this.startTimer);
      this.verbose('Start timer reset.');
    }
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      if (this.microLobby?.lobbyStatic?.isHost) {
        this.info('Starting game');
        this.gameSocket.sendChatMessage('AutoHost functionality provided by WC3 MultiTool.');
        this.gameSocket.sendMessage({LobbyStart: {}});
      }
    }, delay * 1000 + 250);
  }

  autoBalance() {
    if (!this.microLobby?.statsAvailable) {
      this.warn('Can not autobalance. Stats are not available.');
      return false;
    }
    if (this.bestCombo.length !== 0) {
      this.warn('Already balancing teams.');
      return false;
    }
    this.info('Auto balancing teams');
    const swaps = generateAutoBalance(
      this.exportDataStructure('Self export 5', true),
      this.microLobby.nonSpecPlayers,
      this.settings.values.elo.excludeHostFromSwap ? this.microLobby.lobbyStatic.playerHost : false,
      this.microLobby.exportMin(),
    );

    if (swaps === true) {
      this.emitLobbyUpdate({lobbyBalanced: true});
      return;
    } else if (swaps.error) {
      this.error(swaps.error);
      return;
    }
    if (swaps.twoTeams) {
      this.bestCombo = swaps.twoTeams.bestCombo;
      if (swaps.twoTeams.team1Swaps.length === 0) {
        this.gameSocket.sendChatMessage('Teams are already balanced.');
        this.emitLobbyUpdate({lobbyBalanced: true});
      } else if (this.microLobby) {
        this.info('Autobalance target: ', swaps.twoTeams);
        if (!this.microLobby.lobbyStatic.isHost) {
          this.gameSocket.sendChatMessage(
            swaps.twoTeams.leastSwapTeam + ' should be: ' + this.bestCombo.join(', '),
          );
        } else {
          for (let i = 0; i < swaps.twoTeams.team1Swaps.length; i++) {
            if (!this.isLobbyReady()) {
              this.info('Lobby no longer ready.');
              break;
            }
            this.clientState.updateClientState({
              currentStep:
                'Swapping ' + swaps.twoTeams.team1Swaps[i] + ' and ' + swaps.twoTeams.team2Swaps[i],
              currentStepProgress: 100,
            });
            this.swapPlayers({
              players: [swaps.twoTeams.team1Swaps[i], swaps.twoTeams.team2Swaps[i]],
              forBalance: true,
            });
          }
        }
      }
    } else if (swaps.moreTeams) {
      this.info('Autobalance target: ', swaps.moreTeams);
      this.bestCombo = swaps.moreTeams.bestCombo;
      if (this.microLobby.lobbyStatic?.isHost) {
        swaps.moreTeams.swaps.forEach(swap => {
          this.clientState.updateClientState({
            currentStep: 'Swapping ' + swap[0] + ' and ' + swap[1],
            currentStepProgress: 100,
          });
          this.swapPlayers({
            players: swap,
            forBalance: true,
          });
        });
      } else {
        const playerTeamNames = Object.values(this.microLobby.teamListLookup).filter(
          team => team.type === 'playerTeams',
        );
        for (let i = 0; i < playerTeamNames.length; i++) {
          this.gameSocket.sendChatMessage(
            playerTeamNames[i] + ' should be ' + swaps.moreTeams.bestCombo[i].join(', '),
          );
        }
      }
    }
  }

  async initDatabase() {
    if (this.dbConn) {
      await this.dbConn.close();
    }
    this.dbConn = null;
    if (this.settings.values.elo.type === 'mariadb' || this.settings.values.elo.type === 'mysql') {
      const host = this.settings.values.elo.dbIP;
      //
      if (!host || !/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/.test(host)) {
        this.info('Missing or invalid DB Ip address');
        return;
      }
      const user = this.settings.values.elo.dbUser;
      if (!user) {
        this.info('Missing DB username');
        return;
      }
      const pass = this.settings.values.elo._dbPassword;
      if (!pass) {
        this.info('Missing DB password');
        return;
      }
      const database = this.settings.values.elo.dbName;
      if (!database) {
        this.info('Missing DB name');
        return;
      }
      const port = this.settings.values.elo.dbPort;
      if (!port) {
        this.info('Missing DB name');
        return;
      }
      this.dbConn = new Sequelize(database, user, pass, {
        host,
        port,
        dialect: this.settings.values.elo.type,
      });
    } else if (this.settings.values.elo.type === 'sqlite') {
      this.dbConn = new Sequelize({
        dialect: 'sqlite',
        storage: this.settings.values.elo.sqlitePath,
      });
    } else {
      return;
    }
    try {
      await this.dbConn.authenticate();
      this.info('Database connection has been established successfully.');
      this.notification('Success', 'Database connection has been established successfully.');
      //this.buildModel();
    } catch (error) {
      this.warn('Unable to connect to the database:', error);
    }
  }

  isLobbyReady() {
    const teams = this.exportDataStructure('Self export 4', true);
    if (!teams) {
      return false;
    }
    if (this.refreshing) {
      this.verbose('Refreshing slots, not ready.');
      return false;
    }
    if (this.expectedSwaps.length > 0) {
      this.verbose('Expecting player swaps, not ready.');
      return false;
    }
    if (this.settings.values.elo.type !== 'off') {
      if (!this.microLobby?.lookupName) {
        this.verbose('No ELO lookup name');
        return false;
      } else if (this.microLobby.statsAvailable) {
        if (this.fetchingStats.length > 0) {
          this.verbose('Still fetching stats: ', this.fetchingStats);
          return false;
        }
        for (const team of Object.values(teams)) {
          const waitingForStats = team.filter(
            slot =>
              slot.realPlayer &&
              (!slot.data.cleared ||
                !slot.data.extra ||
                (slot.data.extra.rating && slot.data.extra.rating < 0)),
          );
          if (waitingForStats.length > 0) {
            this.verbose(
              'Missing Stats: ',
              waitingForStats.map(slot => slot.name + ' (' + JSON.stringify(slot.data) + ')'),
            );
            return false;
          }
        }
      }
    }
    this.verbose('Lobby ready');
    return true;
  }

  shufflePlayers(shuffleTeams: boolean = true) {
    if (this.microLobby?.lobbyStatic.isHost) {
      this.gameSocket.sendChatMessage('Shuffling players...');
      const players = this.microLobby.nonSpecPlayers;
      const swappedPlayers: Array<string> = [];
      Object.values(players).forEach(player => {
        const targetPlayer = players[Math.floor(Math.random() * players.length)];
        if (
          this.microLobby &&
          targetPlayer !== player &&
          !swappedPlayers.includes(targetPlayer) &&
          !swappedPlayers.includes(player)
        ) {
          // If teams can be shuffled as well, otherwise if the teams of the players to be swapped are different.
          if (
            shuffleTeams ||
            this.microLobby.slots[this.microLobby.playerToSlot(player)].team !==
              this.microLobby.slots[this.microLobby.playerToSlot(targetPlayer)].team
          ) {
            swappedPlayers.push(player);
            swappedPlayers.push(targetPlayer);
            this.swapPlayers({
              players: [player, targetPlayer],
            });
          }
        }
      });
    }
  }

  banPlayer(player: string) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.error('Only the host can ban players');
      return;
    }
    const targetSlot = Object.values(this.microLobby.slots).find(
      slot => slot.name === player && slot.isSelf === false,
    );
    if (targetSlot) {
      this.banSlot(targetSlot.slot);
    } else {
      this.gameSocket.sendChatMessage('Player not found');
    }
  }

  closePlayer(player: string) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.error('Only the host can close players');
      return;
    }
    const targetSlot = Object.values(this.microLobby.slots).find(
      slot => slot.name === player && slot.isSelf === false,
    );
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.gameSocket.sendChatMessage('Player not found');
    }
  }

  swapPlayers(data: {
    slots?: [SlotNumbers, SlotNumbers];
    players?: [string, string];
    forBalance?: boolean;
  }) {
    if (this.microLobby?.lobbyStatic.isHost) {
      if (data.slots && data.slots.length === 2) {
        if (
          this.microLobby.slots[data.slots[0] - 1].playerRegion &&
          this.microLobby.slots[data.slots[1] - 1].playerRegion
        ) {
          data.players = [
            this.microLobby.slots[data.slots[0] - 1].name,
            this.microLobby.slots[data.slots[1] - 1].name,
          ];
        } else {
          this.warn('Tried to swap a non-player and player.');
        }
      }
      if (data.players && data.players.length === 2) {
        const target1 = this.microLobby.searchPlayer(data.players[0])[0];
        const target2 = this.microLobby.searchPlayer(data.players[1])[0];
        if (target1 && target2 && target1 !== target2) {
          this.expectedSwaps.push({
            swaps: [target1, target2].sort() as [string, string],
            forBalance: data.forBalance ?? false,
          });
          this.gameSocket.sendChatMessage('!swap ' + target1 + ' ' + target2);
        } else {
          this.gameSocket.sendChatMessage('Possible invalid swap targets');
          this.error('Possible invalid swap targets: ' + target1 + ' and ' + target2);
        }
      } else {
        this.gameSocket.sendChatMessage('Possible invalid swap targets');
        this.error('Possible invalid swap targets: ' + JSON.stringify(data.players));
      }
    }
  }

  kickPlayer(player: string) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.error('Only the host can kick players');
      return;
    }
    const targetSlot = Object.values(this.microLobby.slots).find(
      slot => slot.name === player && slot.isSelf === false,
    );
    if (targetSlot) {
      this.kickSlot(targetSlot.slot);
    } else {
      this.gameSocket.sendChatMessage('Player not found');
    }
  }

  openPlayer(player: string) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.error('Only the host can open slots');
      return;
    }
    const targetSlot = Object.values(this.microLobby.slots).find(
      slot => slot.name === player && slot.isSelf === false,
    );
    if (targetSlot) {
      this.closeSlot(targetSlot.slot);
    } else {
      this.gameSocket.sendChatMessage('Player not found');
    }
  }

  setPlayerHandicap(player: string, handicap: AvailableHandicaps) {
    if (this.microLobby?.lobbyStatic.isHost !== true) {
      this.error('Only the host can set handicaps');
      return;
    }
    const targetSlot = Object.values(this.microLobby.slots).find(slot => slot.name === player);
    if (targetSlot) {
      this.setHandicapSlot(targetSlot.slot, handicap);
    } else {
      this.gameSocket.sendChatMessage('Player not found');
    }
  }

  banSlot(slotNumber: number) {
    return this.slotInteraction('BanPlayerFromGameLobby', slotNumber);
  }

  closeSlot(slotNumber: number) {
    return this.slotInteraction('CloseSlot', slotNumber);
  }

  kickSlot(slotNumber: number) {
    return this.slotInteraction('KickPlayerFromGameLobby', slotNumber);
  }

  openSlot(slotNumber: number) {
    return this.slotInteraction('OpenSlot', slotNumber);
  }

  setHandicapSlot(slotNumber: number, handicap: AvailableHandicaps) {
    //50|60|70|80|90|100
    this.gameSocket.sendMessage({
      SetHandicap: {
        slot: slotNumber,
        handicap,
      },
    });
  }

  private slotInteraction(action: SlotInteractions, slotNumber: number) {
    if (this.microLobby?.lobbyStatic.isHost) {
      const targetSlot = Object.values(this.microLobby.slots).find(
        slot => slot.slot === slotNumber && !slot.isSelf && slot.slotTypeChangeEnabled,
      );
      if (targetSlot) {
        this.gameSocket.sendMessage({
          [action]: {
            slot: slotNumber,
          },
        });
        return targetSlot;
      }
    }
  }

  allPlayerTeamsContainPlayers(): boolean {
    const teams = this.exportDataStructure('Self export 3');
    if (!teams) {
      return false;
    }
    for (const team of Object.values(teams)) {
      if (team.filter(slot => slot.realPlayer).length === 0) {
        return false;
      }
    }
    return true;
  }

  exportDataStructureString(playerTeamsOnly: boolean = true): string | false {
    const data = this.exportDataStructure('Self export 2', playerTeamsOnly);
    if (!data) {
      return false;
    }
    let exportString = '';
    Object.entries(data).forEach(([teamName, data]) => {
      exportString += teamName + ':\n';
      const combinedData = data.map(
        playerData =>
          playerData.name +
          (playerData.data.extra?.rating && playerData.data.extra.rating > -1
            ? ': ' +
              [
                playerData.data.extra.rating,
                playerData.data.extra.rank,
                playerData.data.extra.wins,
                playerData.data.extra.losses,
              ].join('/')
            : ''),
      );
      exportString += combinedData.join('\n') ?? '';
      exportString += '\n';
    });
    return exportString;
  }

  exportDataStructure(source: string, playerTeamsOnly: boolean = true): PlayerTeamsData | false {
    const lobby = this.microLobby;
    if (!lobby) {
      this.warn('No lobby to export data from.', source);
      return false;
    }
    return lobby.exportTeamStructure(playerTeamsOnly);
  }

  exportTeamStructureString(playerTeamsOnly: boolean = true): string | false {
    const data = this.exportDataStructure('Self export 1', playerTeamsOnly);
    if (!data) {
      return false;
    }
    let exportString = '';
    Object.entries(data).forEach(([teamName, data]) => {
      exportString += teamName + ':\n';
      const combinedData = data.map(
        data =>
          data.name +
          (data.data.extra && data.data.extra.rating && data.data.extra.rating > -1
            ? ': ' +
              [
                data.data.extra.rating,
                data.data.extra.rank,
                data.data.extra.wins,
                data.data.extra.losses,
              ].join('/')
            : ''),
      );
      exportString += combinedData.join('\n') ?? '';
      exportString += '\n';
    });
    return exportString;
  }

  getPlayerData(player: string) {
    return this.microLobby?.getAllPlayerData()[player] ?? false;
  }

  emitLobbyUpdate(update: LobbyUpdatesExtended) {
    this.emit('lobbyUpdate', update);
  }

  async leaveGame() {
    this.info('Leaving Game');
    if (
      this.gameState.values.inGame ||
      ['GAME_LOBBY', 'CUSTOM_GAME_LOBBY'].includes(this.gameState.values.menuState)
    ) {
      this.leftGame = false;
      this.gameSocket.sendMessage({LeaveGame: {}});
      if (this.microLobby?.lobbyStatic?.lobbyName) {
        await sleep(3000);
        if (!this.leftGame) {
          this.info('Lobby did not leave, trying again');
          await this.warControl.exitGame();
          this.warControl.openWarcraft();
        } else {
          this.leftGame = false;
        }
      }
    } else {
      this.warn("Tried to leave game that doesn't exist.");
    }
  }
}
export const lobbyControl = new LobbyControl();
