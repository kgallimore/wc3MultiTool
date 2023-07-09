import { ModuleBase } from "../moduleBase";
import { fn } from "sequelize";

import type { Regions, SlotNumbers } from "wc3mt-lobby-container";
import type { LobbyUpdatesExtended } from "./lobbyControl";

import type { GameSocketEvents, AvailableHandicaps } from "./../globals/gameSocket";
import { isInt, ensureInt } from "./../utility";
import type { AutoHostSettings } from "./../globals/settings";

import { BanList } from "../models/BanList";
import { WhiteList } from "../models/WhiteList";
import { AdminList } from "../models/AdminList";

export type FetchWhiteBanListSortOptions =
  | "id"
  | "username"
  | "admin"
  | "region"
  | "reason";

export type AdminRoles = "baswapper" | "swapper" | "moderator" | "admin";
export type AdminCommands =
  | "st"
  | "sp"
  | "start"
  | "closeall"
  | "a"
  | "closeall"
  | "hold"
  | "mute"
  | "unmute"
  | "swap"
  | "handi"
  | "close"
  | "open"
  | "openall"
  | "kick"
  | "ban"
  | "unban"
  | "white"
  | "unwhite"
  | "perm"
  | "unperm"
  | "autohost"
  | "autostart"
  | "balance";

export interface FetchListOptions {
  type: "whiteList" | "banList";
  page?: number;
  sort?: FetchWhiteBanListSortOptions;
  sortOrder?: "ASC" | "DESC";
  activeOnly?: boolean;
}

class Administration extends ModuleBase {
  // db = new Sequelize({
  //   dialect: "sqlite",
  //   storage: app.getPath("userData") + "/wc3mt.db",
  //   models: [__dirname + "../models"],
  // });

  // banList = this.db.define("banList", whiteBanList, {
  //   freezeTableName: true,
  // });
  // whiteList = this.db.define("whiteList", whiteBanList, {
  //   freezeTableName: true,
  // });
  // adminList = this.db.define(
  //   "adminList",
  //   {
  //     id: {
  //       type: DataTypes.INTEGER,
  //       allowNull: false,
  //       autoIncrement: true,
  //       primaryKey: true,
  //     },
  //     username: {
  //       type: DataTypes.STRING,
  //       allowNull: false,
  //     },
  //     admin: {
  //       type: DataTypes.STRING,
  //       allowNull: false,
  //     },
  //     region: {
  //       type: DataTypes.STRING,
  //       allowNull: false,
  //     },
  //     role: {
  //       type: DataTypes.STRING,
  //       allowNull: false,
  //     },
  //   },
  //   { freezeTableName: true }
  // );

  constructor() {
    super("Administration", { listeners: ["gameSocketEvent", "lobbyUpdate"] });

    // this.db.sync({ force: true });
    // this.db.exec(
    //   "CREATE TABLE IF NOT EXISTS lobbyEvents(id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, time DATETIME default current_timestamp NOT NULL, data TEXT, username TEXT)"
    // );
    // if (this.clientState.values.tableVersion < 1) {
    //   this.info("Updating tables");
    //   try {
    //     this.db.exec("ALTER TABLE banList rename to banListBackup");
    //     this.db.exec(
    //       "CREATE TABLE IF NOT EXISTS banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, removal_date DATETIME)"
    //     );
    //     this.db.exec("INSERT INTO banList SELECT * FROM banListBackup;");
    //   } catch (e) {
    //     this.info("Already at table version 1");
    //   }
    //   store.set("tableVersion", 1);
    //   this.clientState.updateClientState({ tableVersion: 1 });
    // }
    // if (this.clientState.values.tableVersion < 2) {
    //   this.info("Updating tables");
    //   try {
    //     this.db.exec("ALTER TABLE whiteList RENAME COLUMN white_date TO add_date");
    //     this.db.exec("ALTER TABLE whiteList RENAME COLUMN unwhite_date TO removal_date");
    //     this.db.exec("ALTER TABLE banList RENAME COLUMN ban_date TO add_date");
    //     this.db.exec("ALTER TABLE banList RENAME COLUMN unban_date TO removal_date");
    //   } catch (e) {
    //     this.error("Already at table version 2");
    //   }
    //   store.set("tableVersion", 2);
    //   this.clientState.updateClientState({ tableVersion: 2 });
    // }
  }

  protected async onGameSocketEvent(events: GameSocketEvents): Promise<void> {
    if (events.processedChat) {
      let sender = events.processedChat.sender;
      if (events.processedChat.content.match(/^\?/)) {
        var command = events.processedChat.content.replace(/^\?/, "");
        if (command.match(/^(help)|(commands)/i)) {
          if (this.lobby.microLobby?.lobbyStatic.isHost) {
            if (this.lobby.microLobby?.statsAvailable) {
              this.gameSocket.sendChatMessage(
                "?stats <?player>: Return back your stats, or target player stats"
              );
            }
            if (
              ["rapidHost", "smartHost"].includes(this.settings.values.autoHost.type) &&
              this.settings.values.autoHost.voteStart
            ) {
              this.gameSocket.sendChatMessage(
                "?voteStart: Starts or accepts a vote to start"
              );
            }
            if (await this.checkRole(sender, "moderator")) {
              this.gameSocket.sendChatMessage("?a: Aborts game start");
              this.gameSocket.sendChatMessage(
                "?ban <name|slotNumber> <?reason>: Bans a player forever"
              );
              this.gameSocket.sendChatMessage(
                "?close<?all> <name|slotNumber>: Closes all / a slot/player"
              );
              this.gameSocket.sendChatMessage(
                "?handi <name|slotNumber> <50|60|70|80|100>: Sets slot/player handicap"
              );
              this.gameSocket.sendChatMessage("?hold <name>: Holds a slot");
              this.gameSocket.sendChatMessage(
                "?kick <name|slotNumber> <?reason>: Kicks a slot/player"
              );
              this.gameSocket.sendChatMessage(
                "?<un>mute <player>: Mutes/un-mutes a player"
              );
              this.gameSocket.sendChatMessage(
                "?open<?all> <name|slotNumber> <?reason>: Opens all / a slot/player"
              );
              this.gameSocket.sendChatMessage("?unban <name>: Un-bans a player");
              this.gameSocket.sendChatMessage("?white <name>: Whitelists a player");
              this.gameSocket.sendChatMessage("?unwhite <name>: Un-whitelists a player");
              this.gameSocket.sendChatMessage("?start: Starts game");
              this.gameSocket.sendChatMessage(
                "?swap <name|slotNumber> <name|slotNumber>: Swaps players"
              );
              this.gameSocket.sendChatMessage(
                "?sp: Shuffles players completely randomly"
              );
              this.gameSocket.sendChatMessage(
                "?st: Shuffles players randomly between teams"
              );
            }
            if (await this.checkRole(sender, "admin")) {
              this.gameSocket.sendChatMessage(
                "?perm <name> <?admin|mod|swapper>: Promotes a player to a role (mod by default)"
              );
              this.gameSocket.sendChatMessage("?unperm <name>: Demotes player to normal");
              this.gameSocket.sendChatMessage(
                "?autohost <?off|rapid|lobby|smart>: Gets/?Sets autohost type"
              );
            }
            this.gameSocket.sendChatMessage(
              "?help: Shows commands with <required arg> <?optional arg>"
            );
          }
        } else {
          var content = command.split(" ");
          const role = await this.getRole(sender);
          if (role) {
            let runCom = await this.runCommand(
              content[0] as AdminCommands,
              role,
              sender,
              content.slice(1)
            );
            if (runCom) {
              this.gameSocket.sendChatMessage(runCom);
            }
          }
        }
      } else {
        this.gameSocket.emitEvent({ nonAdminChat: events.processedChat });
      }
    }
  }

  public async runCommand(
    command: AdminCommands,
    role: AdminRoles | null,
    user: string,
    args?: string[]
  ): Promise<string | false> {
    this.info("Running command: " + command, role, user, args);
    var retString = "";
    switch (command) {
      case "sp":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          this.lobby.shufflePlayers();
        }
        break;
      case "st":
        if (
          this.lobby.microLobby?.lobbyStatic?.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          this.lobby.shufflePlayers(false);
        }
        break;
      case "start":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          this.lobby.startGame();
        }
        break;
      case "a":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          this.gameSocket.cancelStart();
        }
        break;
      case "closeall":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          this.gameSocket.sendChatMessage("!closeall");
        }
        break;
      case "hold":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          let targetPlayer = args?.[0];
          if (targetPlayer) {
            this.gameSocket.sendChatMessage("!hold " + targetPlayer);
          } else {
            retString = "Player target required.";
          }
        }
        break;
      case "mute":
        if (this.roleEqualOrHigher(role, "moderator")) {
          let targetPlayer = args?.[0];
          if (targetPlayer) {
            this.gameSocket.sendChatMessage("!mute " + targetPlayer);
            this.info(user + " muted " + targetPlayer);
          } else {
            retString = "Player target required.";
          }
        }
        break;
      case "unmute":
        if (this.roleEqualOrHigher(role, "moderator")) {
          let targetPlayer = args?.[0];
          if (targetPlayer) {
            this.gameSocket.sendChatMessage("!unmute " + targetPlayer);
            this.info(user + " unmuted " + targetPlayer);
          } else {
            retString = "Player target required.";
          }
        }
        break;
      case "openall":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          this.gameSocket.sendChatMessage("!openall");
        }
        break;
      case "swap":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "baswapper")
        ) {
          if (args && args.length === 2) {
            let playerData = this.lobby.microLobby?.getAllPlayerData();
            let tenMinutesAgo = Date.now() - 10 * 60 * 1000;
            if (isInt(args[1], 24, 1) && isInt(args[0], 24, 1)) {
              if (
                this.roleEqualOrHigher(role, "swapper") ||
                (playerData[this.lobby.microLobby?.slots[parseInt(args[0]) - 1].name]
                  .joinedAt > tenMinutesAgo &&
                  playerData[this.lobby.microLobby?.slots[parseInt(args[1]) - 1].name]
                    .joinedAt > tenMinutesAgo)
              ) {
                this.lobby.swapPlayers({
                  slots: [
                    ensureInt(args[0]) as SlotNumbers,
                    ensureInt(args[1]) as SlotNumbers,
                  ],
                });
              } else {
                retString =
                  "You can only swap players who joined within the last 10 minutes.";
              }
            } else if (
              this.lobby.microLobby?.searchPlayer(args[1]).length === 1 &&
              this.lobby.microLobby?.searchPlayer(args[0]).length === 1
            ) {
              if (
                this.roleEqualOrHigher(role, "swapper") ||
                (playerData[this.lobby.microLobby?.searchPlayer(args[1])[0]].joinedAt >
                  tenMinutesAgo &&
                  playerData[this.lobby.microLobby?.searchPlayer(args[0])[0]].joinedAt >
                    tenMinutesAgo)
              ) {
                this.lobby.swapPlayers({ players: [args[0], args[1]] });
              } else {
                retString =
                  "You can only swap players who joined within the last 10 minutes.";
              }
            } else {
              retString = "All swap players not found, or too many matches.";
            }
          } else {
            retString = "Invalid swap arguments";
          }
        }
        break;
      case "handi":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args?.length === 2) {
            var target = args[0];
            // TODO check handicaps
            var handicap = parseInt(args[1]) as AvailableHandicaps;
            if (isInt(target, 24, 1)) {
              if (handicap) {
                this.lobby.setHandicapSlot(parseInt(target) - 1, handicap);
              } else {
                this.lobby.setPlayerHandicap(target, handicap);
              }
            } else {
              retString = "Invalid handicap";
            }
          } else {
            retString = "Invalid number of arguments";
          }
        }
        break;
      case "close":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            if (isInt(target, 24, 1)) {
              this.lobby.closeSlot(parseInt(target) - 1);
            } else {
              let targets = this.lobby.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.lobby.closePlayer(targets[0]);
              } else if (targets.length > 1) {
                retString = "Multiple matches found. Please be more specific.";
              } else {
                retString = "No matches found.";
              }
            }
          } else {
            retString = "Kick target required";
          }
        }
        break;
      case "open":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            if (isInt(target, 24, 1)) {
              this.lobby.openSlot(parseInt(target) - 1);
            } else {
              let targets = this.lobby.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.lobby.kickPlayer(targets[0]);
              } else if (targets.length > 1) {
                retString = "Multiple matches found. Please be more specific.";
              } else {
                retString = "No matches found.";
              }
            }
          } else {
            retString = "Open target required";
          }
        }
        break;
      case "kick":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            if (isInt(target, 24, 1)) {
              this.lobby.kickSlot(parseInt(target) - 1);
            } else {
              let targets = this.lobby.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.lobby.kickPlayer(targets[0]);
              } else if (targets.length > 1) {
                retString = "Multiple matches found. Please be more specific.";
              } else {
                retString = "No matches found.";
              }
            }
          } else {
            retString = "Kick target required";
          }
        }
        break;
      case "ban":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            var reason = args.slice(2).join(" ") || "";
            if (isInt(target, 24, 1)) {
              this.lobby.banSlot(parseInt(target) - 1);
              this.banPlayer(
                this.lobby.microLobby?.slots[target].name,
                user,
                this.lobby.microLobby?.region,
                reason
              );
            } else {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                retString = "Banning out of lobby player.";
                this.banPlayer(target, user, this.lobby.microLobby?.region, reason);
              } else {
                let targets = this.lobby.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  this.banPlayer(targets[0], user, this.lobby.microLobby?.region, reason);
                } else if (targets.length > 1) {
                  retString = "Multiple matches found. Please be more specific.";
                } else {
                  retString = "No matches found.";
                }
              }
            }
          } else {
            retString = "Target required";
          }
        }
        break;
      case "unban":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              retString = "Unbanning out of lobby player.";
              this.unBanPlayer(target, user);
            } else {
              retString = "Full battleTag required";
              this.info("Full battleTag required");
            }
          } else {
            retString = "Ban target required";
            this.info("Ban target required");
          }
        }
        break;
      case "white":
        if (
          this.lobby.microLobby?.lobbyStatic?.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            var reason = args.slice(2).join(" ") || "";
            if (isInt(target, 24, 1)) {
              this.whitePlayer(
                this.lobby.microLobby?.slots[target].name,
                user,
                this.lobby.microLobby?.region,
                reason
              );
            } else {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                retString = "Whitelisting out of lobby player.";
                this.whitePlayer(target, user, this.lobby.microLobby?.region, reason);
              } else {
                let targets = this.lobby.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  this.whitePlayer(
                    targets[0],
                    user,
                    this.lobby.microLobby?.region,
                    reason
                  );
                } else if (targets.length > 1) {
                  retString = "Multiple matches found. Please be more specific.";
                } else {
                  retString = "No matches found.";
                }
              }
            }
          } else {
            retString = "Target required";
          }
        }
        break;
      case "unwhite":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "moderator")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              retString = "Un-whitelisting out of lobby player.";
              this.unWhitePlayer(target, user);
            } else {
              retString = "Full battleTag required";
              this.info("Full battleTag required");
            }
          } else {
            retString = "Un-whitelist target required";
            this.info("Un-whitelist target required");
          }
        }
        break;
      case "perm":
        console.log("perm");
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "admin")
        ) {
          console.log("perm2");

          if (args && args.length > 1) {
            var target = args[0];
            var perm: "mod" | AdminRoles =
              (args[1]?.toLowerCase() as
                | null
                | "baswapper"
                | "swapper"
                | "moderator"
                | "admin") ?? "mod";
            perm = perm === "mod" ? "moderator" : perm;
            if (["baswapper", "swapper", "moderator", "admin"].includes(perm)) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                retString = "Assigning out of lobby player " + perm + ".";
                this.addAdmin(target, user, this.lobby.microLobby?.region, perm);
              } else {
                let targets = this.lobby.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  if (
                    await this.addAdmin(
                      targets[0],
                      user,
                      this.lobby.microLobby?.region,
                      perm
                    )
                  ) {
                    retString = targets[0] + " has been promoted to " + perm + ".";
                  } else {
                    retString = "Could not promote " + targets[0] + " to " + perm + ".";
                  }
                } else if (targets.length > 1) {
                  retString = "Multiple matches found. Please be more specific.";
                } else {
                  retString = "No matches found.";
                }
              }
            } else {
              retString = "Invalid permission";
            }
          } else {
            retString = "Target required";
          }
        }
        break;
      case "unperm":
        if (
          this.lobby.microLobby?.lobbyStatic?.isHost &&
          this.roleEqualOrHigher(role, "admin")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              if (await this.removeAdmin(target, user)) {
                retString = "Removed perm from out of lobby player: " + target;
              } else {
                retString = "Could not remove perm from out of lobby player: " + target;
              }
            } else {
              let targets = this.lobby.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                if (await this.removeAdmin(targets[0], user)) {
                  retString = targets[0] + " has been demoted.";
                } else {
                  retString = targets[0] + " has no permissions.";
                }
              } else if (targets.length > 1) {
                retString = "Multiple matches found. Please be more specific.";
              } else {
                retString = "No matches found.";
              }
            }
          } else {
            retString = "Target required";
          }
        }
        break;
      case "autohost":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "admin")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            target = target.toLowerCase();
            if (["off", "rapid", "lobby", "smart"].includes(target)) {
              if (target !== "off") {
                target += "Host";
              }
              retString = "Setting autohost type to: " + target;
              this.settings.updateSettings({
                autoHost: { type: target as AutoHostSettings["type"] },
              });
            } else {
              retString = "Invalid autohost type";
            }
          } else {
            retString = "Autohost current type: " + this.settings.values.autoHost.type;
          }
        }
        break;
      case "autostart":
        if (
          this.lobby.microLobby?.lobbyStatic.isHost &&
          this.roleEqualOrHigher(role, "admin")
        ) {
          if (args && args.length > 0) {
            var target = args[0];
            if (isInt(target, 24, 0)) {
              var startTarget = parseInt(target);
              retString = "Setting autostart number to: " + startTarget.toString();
              if (this.settings.values.autoHost.type === "off") {
                retString = "Autohost must be enabled to autostart.";
              }
              this.settings.updateSettings({ autoHost: { minPlayers: startTarget } });
            } else {
              retString = "Invalid autostart number";
            }
          } else {
            retString =
              "Autostart current number: " + this.settings.values.autoHost.minPlayers;
          }
        }
        break;
      case "balance":
        this.lobby.autoBalance();
        break;
      default:
        return false;
        break;
    }
    return retString;
  }

  protected onLobbyUpdate(updates: LobbyUpdatesExtended): void {
    if (updates.playerJoined) {
      if (updates.playerJoined.name) {
        this.clearPlayer(updates.playerJoined);
      } else {
        this.warn("Nameless player joined");
      }
    }
    if (updates.newLobby) {
      Object.values(updates.newLobby.slots)
        .filter((slot) => slot.slotStatus === 2 && (slot.playerRegion || slot.isSelf))
        .forEach((slot) => {
          this.clearPlayer(slot);
        });
    }
  }

  async clearPlayer(data: { name: string; slot: number; [key: string]: any }) {
    this.verbose("Checking if player is clear: " + data.name);
    let isClear = await this.checkPlayer(data.name);
    if (!isClear.type) {
      this.lobby.clearPlayer(data.name, true);
    } else {
      this.lobby.banSlot(data.slot);
      if (isClear.type === "black") {
        this.gameSocket.sendChatMessage(
          data.name +
            " is permanently banned" +
            (isClear.reason ? ": " + isClear.reason : "")
        );
        this.info(
          "Kicked " +
            data.name +
            " for being banned" +
            (isClear ? " for: " + isClear : "")
        );
      } else if (isClear.type === "white") {
        this.lobby.banSlot(data.slot);
        this.gameSocket.sendChatMessage(data.name + " is not whitelisted");
        this.info("Kicked " + data.name + " for not being whitelisted");
      } else {
        this.info("Player cleared: " + data.name);
      }
    }
  }

  async checkPlayer(
    name: string
  ): Promise<{ type: "black" | "white" | false; reason?: string | undefined }> {
    let row = await this.isBanned(name);
    if (row) {
      return { type: "black", reason: row.reason };
    }
    if (this.settings.values.autoHost.whitelist) {
      if (name !== this.gameState.values.selfBattleTag && !this.isWhiteListed(name)) {
        return { type: "white" };
      }
    }
    return { type: false };
  }

  async banPlayer(
    player: string,
    admin: string,
    region: Regions | "client",
    reason = "",
    bypassCheck: boolean = false
  ): Promise<true | { reason: string }> {
    if ((await this.checkRole(admin, "moderator")) || bypassCheck) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        if (await this.checkRole(player, "admin")) {
          this.warn(
            "Can not ban an admin (" + player + ") without removing permissions first."
          );
          return { reason: "Can not ban an admin without removing permissions first." };
        }
        //const newBan = new BanList({ username: player, admin, region, reason });
        BanList.create({ username: player, admin, region, reason });
        this.info("Banned " + player + " by " + admin + (reason ? " for " + reason : ""));
        this.sendWindow({
          legacy: {
            messageType: "action",
            data: {
              value:
                "Banned " + player + " by " + admin + (reason ? " for " + reason : ""),
            },
          },
        });
        if (this.lobby.microLobby?.allPlayers.includes(player)) {
          this.lobby.banPlayer(player);
          this.gameSocket.sendChatMessage(
            player + " banned" + (reason ? " for " + reason : "")
          );
        }
        return true;
      } else {
        this.error("Failed to ban, invalid battleTag: " + player);
        return { reason: "Failed to ban, invalid battleTag: " + player };
      }
    } else {
      this.info(
        "Failed to ban " + player + " by " + admin + ": Missing required permissions."
      );
    }

    return { reason: "Missing required permissions." };
  }

  async whitePlayer(
    player: string,
    admin: string,
    region: Regions | "client",
    reason = "",
    bypassCheck: boolean = false
  ): Promise<true | { reason: string }> {
    if ((await this.checkRole(admin, "moderator")) || bypassCheck) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        WhiteList.create({ username: player, admin, region, reason });
        this.info(
          "Whitelisted " + player + " by " + admin + (reason ? " for " + reason : "")
        );
        this.sendWindow({
          legacy: {
            messageType: "action",
            data: {
              value:
                "Whitelisted " +
                player +
                " by " +
                admin +
                (reason ? " for " + reason : ""),
            },
          },
        });
        if (this.lobby.microLobby?.allPlayers.includes(player)) {
          this.gameSocket.sendChatMessage(
            player + " whitelisted" + (reason ? " for " + reason : "")
          );
        }
        return true;
      } else {
        this.error("Failed to whitelist, invalid battleTag: " + player);
        return { reason: "Invalid battleTag" };
      }
    }
    return { reason: "Missing required permissions" };
  }

  async unWhitePlayer(player: string, admin: string): Promise<true | { reason: string }> {
    try {
      await WhiteList.update(
        { removal_date: fn("NOW") },
        { where: { username: player, removal_date: null } }
      );
      this.info("Un-whitelisted " + player + " by " + admin);
      this.sendWindow({
        legacy: {
          messageType: "action",
          data: { value: "Un-whitelisted " + player + " by " + admin },
        },
      });
      return true;
    } catch (err) {
      this.error("Failed to un-whitelist " + player + " by " + admin, err);
      return { reason: "Failed to un-whitelist " + player + " by " + admin };
    }
  }

  async unBanPlayer(player: string, admin: string): Promise<true | { reason: string }> {
    try {
      await BanList.update(
        { removal_date: fn("NOW") },
        { where: { username: player, removal_date: null } }
      );

      this.info("Unbanned " + player + " by " + admin);
      this.sendWindow({
        legacy: {
          messageType: "action",
          data: { value: "Unbanned " + player + " by " + admin },
        },
      });
      return true;
    } catch (err) {
      this.error("Failed to unban " + player + " by " + admin, err);
      return { reason: "Failed to unban " + player + " by " + admin };
    }
  }

  async addAdmin(
    player: string,
    admin: string,
    region: Regions | "client",
    role: AdminRoles = "moderator",
    bypassCheck: boolean = false
  ): Promise<{ reason: string } | undefined> {
    if ((await this.checkRole(admin, "admin")) || bypassCheck) {
      if (["baswapper", "swapper", "moderator", "admin"].includes(role)) {
        if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
          if (await this.checkRole(player, "moderator")) {
            AdminList.update({ role, admin, region }, { where: { username: player } })
              .then(() => {
                this.info("Updated " + player + " to " + role + " by " + admin);
                this.sendWindow({
                  legacy: {
                    messageType: "action",
                    data: {
                      value: "Updated " + player + " to " + role + " by " + admin,
                    },
                  },
                });
              })
              .catch((err) => {
                this.error(
                  "Failed to update " + player + " to " + role + " by " + admin,
                  err
                );
              });
          } else {
            AdminList.create({ username: player, admin, region, role })
              .then(() => {
                this.info("Added " + player + " to " + role + " by " + admin);
                this.sendWindow({
                  legacy: {
                    messageType: "action",
                    data: {
                      value: "Added " + player + " to " + role + " by " + admin,
                    },
                  },
                });
              })
              .catch((err) => {
                this.error(
                  "Failed to add " + player + " to " + role + " by " + admin,
                  err
                );
              });
          }
        } else {
          this.info("Failed to add admin, invalid battleTag: " + player);
          return { reason: "Invalid battleTag" };
        }
      } else {
        this.info("Failed to add admin, invalid role: " + role);
        return { reason: "Invalid role" };
      }
    } else {
      this.info(admin + " is not an admin and can not set perms.");
      return { reason: "Missing required permissions" };
    }
  }

  async removeAdmin(
    player: string,
    admin: string,
    bypassCheck: boolean = false
  ): Promise<{ reason: string } | undefined> {
    if ((await this.checkRole(admin, "admin")) || bypassCheck) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        if (await this.checkRole(player, "baswapper")) {
          AdminList.destroy({ where: { username: player } })
            .then(() => {
              this.info("Removed permissions from " + player);
              this.sendWindow({
                legacy: {
                  messageType: "action",
                  data: { value: "Removed permissions from " + player },
                },
              });
            })
            .catch((err) => {
              this.error("Failed to remove permissions from " + player, err);
            });
        } else {
          this.info(player + " is not a moderator");
          return { reason: "Target has no roles." };
        }
      } else {
        this.error("Failed to remove admin, invalid battleTag: " + player);
        return { reason: "Invalid battleTag" };
      }
    }
    return { reason: "Missing required permissions" };
  }

  async getRole(player: string): Promise<AdminRoles | null> {
    if (
      player === this.gameState.values.selfBattleTag ||
      player === "client" ||
      (player === "Trenchguns#1800" && this.settings.values.client.debugAssistance)
    )
      return "admin";
    const row = await AdminList.findOne({ where: { username: player } });
    return row?.role ?? null;
  }

  async checkRole(player: string, minPerms: AdminRoles) {
    if (!player) return false;

    let targetRole = await this.getRole(player);
    if (targetRole) {
      console.log("targetRole", targetRole);
      return this.roleEqualOrHigher(minPerms, targetRole);
    }
    return false;
  }

  roleEqualOrHigher(role: AdminRoles | null, targetPerms: AdminRoles): boolean {
    if (!role) return false;
    var hierarchy: { [key: string]: number } = {
      admin: 4,
      moderator: 3,
      swapper: 2,
      baswapper: 1,
    };
    if (hierarchy[role] <= hierarchy[targetPerms]) {
      return true;
    }
    return false;
  }

  async isWhiteListed(player: string): Promise<boolean> {
    const row = await WhiteList.findOne({
      where: { username: player, removal_date: null },
    });
    return !!row;
  }

  async isBanned(player: string): Promise<{ reason: string } | null> {
    const row = await BanList.findOne({
      where: { username: player, removal_date: null },
    });
    return row;
  }

  async fetchList(
    options: FetchListOptions
  ): Promise<WhiteList[] | BanList[] | undefined> {
    if (options.type === "whiteList") {
      if (options.activeOnly) {
        return await WhiteList.findAll({
          where: { removal_date: null },
          order: [["id", "ASC"]],
          limit: 10,
          offset: options.page !== undefined ? options.page * 10 : 0,
          raw: true,
        });
      } else {
        return await WhiteList.findAll({
          order: [["id", "ASC"]],
          limit: 10,
          offset: options.page !== undefined ? options.page * 10 : 0,
          raw: true,
        });
      }
    } else if (options.type === "banList") {
      if (options.activeOnly) {
        return await BanList.findAll({
          raw: true,
          where: { removal_date: null },
          order: [["id", "ASC"]],
          limit: 10,
          offset: options.page !== undefined ? options.page * 10 : 0,
        });
      } else {
        return await BanList.findAll({
          raw: true,
          order: [["id", "ASC"]],
          limit: 10,
          offset: options.page !== undefined ? options.page * 10 : 0,
        });
      }
    }
  }
}

export const administration = new Administration();
