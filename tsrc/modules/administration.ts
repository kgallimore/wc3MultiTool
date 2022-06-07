import { Module } from "../moduleBase";

import type { Regions, SlotNumbers } from "wc3mt-lobby-container";
import sqlite3 from "better-sqlite3";
import { app } from "electron";

import Store from "electron-store";
import { GameSocketEvents, AvailableHandicaps } from "./../globals/gameSocket";
import { isInt, ensureInt } from "./../utility";
import type { AutoHostSettings } from "./../globals/settings";
const store = new Store();

export type FetchWhiteBanListSortOptions =
  | "id"
  | "username"
  | "admin"
  | "region"
  | "reason";

export interface FetchListOptions {
  type: "whiteList" | "banList";
  page?: number;
  sort?: FetchWhiteBanListSortOptions;
  sortOrder?: "ASC" | "DESC";
  activeOnly?: boolean;
}

class banWhiteList extends Module {
  db = new sqlite3(app.getPath("userData") + "/wc3mt.db");

  constructor() {
    super();
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, removal_date DATETIME)"
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS whiteList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, removal_date DATETIME)"
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS lobbyEvents(id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, time DATETIME default current_timestamp NOT NULL, data TEXT, username TEXT)"
    );
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS adminList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, role TEXT NOT NULL)"
    );
    if (this.clientState.values.tableVersion < 1) {
      this.info("Updating tables");
      try {
        this.db.exec("ALTER TABLE banList rename to banListBackup");
        this.db.exec(
          "CREATE TABLE IF NOT EXISTS banList(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, add_date DATETIME default current_timestamp NOT NULL, admin TEXT NOT NULL, region TEXT NOT NULL, reason TEXT, removal_date DATETIME)"
        );
        this.db.exec("INSERT INTO banList SELECT * FROM banListBackup;");
      } catch (e) {
        this.info("Already at table version 1");
      }
      store.set("tableVersion", 1);
      this.clientState.updateClientState({ tableVersion: 1 });
    }
    if (this.clientState.values.tableVersion < 2) {
      this.info("Updating tables");
      try {
        this.db.exec("ALTER TABLE whiteList RENAME COLUMN white_date TO add_date");
        this.db.exec("ALTER TABLE whiteList RENAME COLUMN unwhite_date TO removal_date");
        this.db.exec("ALTER TABLE banList RENAME COLUMN ban_date TO add_date");
        this.db.exec("ALTER TABLE banList RENAME COLUMN unban_date TO removal_date");
      } catch (e) {
        this.error("Already at table version 2");
      }
      store.set("tableVersion", 2);
      this.clientState.updateClientState({ tableVersion: 2 });
    }
  }

  protected onGameSocketEvent(events: GameSocketEvents): void {
    if (events.ChatMessage) {
      let sender = events.ChatMessage.message.sender;
      if (events.ChatMessage.message.content.match(/^\?sp$/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          this.lobby?.shufflePlayers();
        }
      } else if (events.ChatMessage.message.content.match(/^\?st$/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic?.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          this.lobby?.shufflePlayers(false);
        }
      } else if (events.ChatMessage.message.content.match(/^\?start$/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          this.lobby.startGame();
        }
      } else if (events.ChatMessage.message.content.match(/^\?a$/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          this.gameSocket.cancelStart();
        }
      } else if (events.ChatMessage.message.content.match(/^\?closeall$/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          this.gameSocket.sendChatMessage("!closeall");
        }
      } else if (events.ChatMessage.message.content.match(/^\?hold$/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          let targetPlayer = events.ChatMessage.message.content.split(" ")[1];
          if (targetPlayer) {
            this.gameSocket.sendChatMessage("!hold " + targetPlayer);
          } else {
            this.gameSocket.sendChatMessage("Player target required.");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?mute$/i)) {
        if (banWhiteListSingle.checkRole(sender, "moderator")) {
          let targetPlayer = events.ChatMessage.message.content.split(" ")[1];
          if (targetPlayer) {
            this.gameSocket.sendChatMessage("!mute " + targetPlayer);
            this.info(sender + " muted " + targetPlayer);
          } else {
            this.gameSocket.sendChatMessage("Player target required.");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?unmute$/i)) {
        if (banWhiteListSingle.checkRole(sender, "moderator")) {
          let targetPlayer = events.ChatMessage.message.content.split(" ")[1];
          if (targetPlayer) {
            this.gameSocket.sendChatMessage("!unmute " + targetPlayer);
            this.info(sender + " unmuted " + targetPlayer);
          } else {
            this.gameSocket.sendChatMessage("Player target required.");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?openall$/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          this.gameSocket.sendChatMessage("!openall");
        }
      } else if (events.ChatMessage.message.content.match(/^\?swap/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "baswapper")
        ) {
          let [command, ...args] = events.ChatMessage.message.content.split(" ");
          if (args.length === 2) {
            let playerData = this.lobby?.microLobby?.getAllPlayerData();
            let tenMinutesAgo = Date.now() - 10 * 60 * 1000;
            if (isInt(args[1], 24, 1) && isInt(args[0], 24, 1)) {
              if (
                banWhiteListSingle.checkRole(sender, "swapper") ||
                (playerData[this.lobby?.microLobby?.slots[parseInt(args[0]) - 1].name]
                  .joinedAt > tenMinutesAgo &&
                  playerData[this.lobby?.microLobby?.slots[parseInt(args[1]) - 1].name]
                    .joinedAt > tenMinutesAgo)
              ) {
                this.lobby?.swapPlayers({
                  slots: [
                    ensureInt(args[0]) as SlotNumbers,
                    ensureInt(args[1]) as SlotNumbers,
                  ],
                });
              } else {
                this.gameSocket.sendChatMessage(
                  "You can only swap players who joined within the last 10 minutes."
                );
              }
            } else if (
              this.lobby?.microLobby?.searchPlayer(args[1]).length === 1 &&
              this.lobby?.microLobby?.searchPlayer(args[0]).length === 1
            ) {
              if (
                banWhiteListSingle.checkRole(sender, "swapper") ||
                (playerData[this.lobby?.microLobby?.searchPlayer(args[1])[0]].joinedAt >
                  tenMinutesAgo &&
                  playerData[this.lobby?.microLobby?.searchPlayer(args[0])[0]].joinedAt >
                    tenMinutesAgo)
              ) {
                this.lobby?.swapPlayers({ players: [args[0], args[1]] });
              } else {
                this.gameSocket.sendChatMessage(
                  "You can only swap players who joined within the last 10 minutes."
                );
              }
            } else {
              this.gameSocket.sendChatMessage(
                "All swap players not found, or too many matches."
              );
            }
          } else {
            this.gameSocket.sendChatMessage("Invalid swap arguments");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?handi/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          if (events.ChatMessage.message.content.split(" ").length === 3) {
            var target = events.ChatMessage.message.content.split(" ")[1];
            // TODO check handicaps
            var handicap = parseInt(
              events.ChatMessage.message.content.split(" ")[2]
            ) as AvailableHandicaps;
            if (isInt(target, 24, 1)) {
              if (handicap) {
                this.lobby?.setHandicapSlot(parseInt(target) - 1, handicap);
              } else {
                this.lobby?.setPlayerHandicap(target, handicap);
              }
            } else {
              this.gameSocket.sendChatMessage("Invalid handicap");
            }
          } else {
            this.gameSocket.sendChatMessage("Invalid number of arguments");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?close/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            if (isInt(target, 24, 1)) {
              this.lobby?.closeSlot(parseInt(target) - 1);
            } else {
              let targets = this.lobby?.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.lobby?.closePlayer(targets[0]);
              } else if (targets.length > 1) {
                this.gameSocket.sendChatMessage(
                  "Multiple matches found. Please be more specific."
                );
              } else {
                this.gameSocket.sendChatMessage("No matches found.");
              }
            }
          } else {
            this.gameSocket.sendChatMessage("Kick target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?open/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            if (isInt(target, 24, 1)) {
              this.lobby?.openSlot(parseInt(target) - 1);
            } else {
              let targets = this.lobby?.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.lobby?.kickPlayer(targets[0]);
              } else if (targets.length > 1) {
                this.gameSocket.sendChatMessage(
                  "Multiple matches found. Please be more specific."
                );
              } else {
                this.gameSocket.sendChatMessage("No matches found.");
              }
            }
          } else {
            this.gameSocket.sendChatMessage("Kick target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?kick/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            if (isInt(target, 24, 1)) {
              this.lobby?.kickSlot(parseInt(target) - 1);
            } else {
              let targets = this.lobby?.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                this.lobby?.kickPlayer(targets[0]);
              } else if (targets.length > 1) {
                this.gameSocket.sendChatMessage(
                  "Multiple matches found. Please be more specific."
                );
              } else {
                this.gameSocket.sendChatMessage("No matches found.");
              }
            }
          } else {
            this.gameSocket.sendChatMessage("Kick target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?ban/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          var targetPlayer = events.ChatMessage.message.content.split(" ")[1];
          if (targetPlayer) {
            var reason =
              events.ChatMessage.message.content.split(" ").slice(2).join(" ") || "";
            if (isInt(targetPlayer, 24, 1)) {
              this.lobby?.banSlot(parseInt(targetPlayer) - 1);
              banWhiteListSingle.banPlayer(
                this.lobby?.microLobby?.slots[targetPlayer].name,
                sender,
                this.lobby?.microLobby?.region,
                reason
              );
            } else {
              if (targetPlayer.match(/^\D\S{2,11}#\d{4,8}$/)) {
                this.gameSocket.sendChatMessage("Banning out of lobby player.");
                banWhiteListSingle.banPlayer(
                  targetPlayer,
                  sender,
                  this.lobby?.microLobby?.region,
                  reason
                );
              } else {
                let targets = this.lobby?.microLobby?.searchPlayer(targetPlayer);
                if (targets.length === 1) {
                  banWhiteListSingle.banPlayer(
                    targets[0],
                    sender,
                    this.lobby?.microLobby?.region,
                    reason
                  );
                } else if (targets.length > 1) {
                  this.gameSocket.sendChatMessage(
                    "Multiple matches found. Please be more specific."
                  );
                } else {
                  this.gameSocket.sendChatMessage("No matches found.");
                }
              }
            }
          } else {
            this.gameSocket.sendChatMessage("Target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?unban/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              this.gameSocket.sendChatMessage("Unbanning out of lobby player.");
              banWhiteListSingle.unBanPlayer(target, sender);
            } else {
              this.gameSocket.sendChatMessage("Full battleTag required");
              this.info("Full battleTag required");
            }
          } else {
            this.gameSocket.sendChatMessage("Ban target required");
            this.info("Ban target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?white/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic?.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          var targetPlayer = events.ChatMessage.message.content.split(" ")[1];
          if (targetPlayer) {
            var reason =
              events.ChatMessage.message.content.split(" ").slice(2).join(" ") || "";
            if (isInt(targetPlayer, 24, 1)) {
              banWhiteListSingle.whitePlayer(
                this.lobby?.microLobby?.slots[targetPlayer].name,
                sender,
                this.lobby?.microLobby?.region,
                reason
              );
            } else {
              if (targetPlayer.match(/^\D\S{2,11}#\d{4,8}$/)) {
                this.gameSocket.sendChatMessage("Whitelisting out of lobby player.");
                banWhiteListSingle.whitePlayer(
                  targetPlayer,
                  sender,
                  this.lobby?.microLobby?.region,
                  reason
                );
              } else {
                let targets = this.lobby?.microLobby?.searchPlayer(targetPlayer);
                if (targets.length === 1) {
                  banWhiteListSingle.whitePlayer(
                    targets[0],
                    sender,
                    this.lobby?.microLobby?.region,
                    reason
                  );
                } else if (targets.length > 1) {
                  this.gameSocket.sendChatMessage(
                    "Multiple matches found. Please be more specific."
                  );
                } else {
                  this.gameSocket.sendChatMessage("No matches found.");
                }
              }
            }
          } else {
            this.gameSocket.sendChatMessage("Target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?unwhite/i)) {
        // TODO: In lobby search and removal
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "moderator")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              this.gameSocket.sendChatMessage("Un-whitelisting out of lobby player.");
              banWhiteListSingle.unWhitePlayer(target, sender);
            } else {
              this.gameSocket.sendChatMessage("Full battleTag required");
              this.info("Full battleTag required");
            }
          } else {
            this.gameSocket.sendChatMessage("Un-whitelist target required");
            this.info("Un-whitelist target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?perm/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "admin")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          var perm: "mod" | "baswapper" | "swapper" | "moderator" | "admin" =
            (events.ChatMessage.message.content.split(" ")[2]?.toLowerCase() as
              | null
              | "baswapper"
              | "swapper"
              | "moderator"
              | "admin") ?? "mod";
          perm = perm === "mod" ? "moderator" : perm;
          if (target) {
            if (["baswapper", "swapper", "moderator", "admin"].includes(perm)) {
              if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
                this.gameSocket.sendChatMessage(
                  "Assigning out of lobby player " + perm + "."
                );
                banWhiteListSingle.addAdmin(
                  target,
                  sender,
                  this.lobby?.microLobby?.region,
                  perm
                );
              } else {
                let targets = this.lobby?.microLobby?.searchPlayer(target);
                if (targets.length === 1) {
                  if (
                    banWhiteListSingle.addAdmin(
                      targets[0],
                      sender,
                      this.lobby?.microLobby?.region,
                      perm
                    )
                  ) {
                    this.gameSocket.sendChatMessage(
                      targets[0] + " has been promoted to " + perm + "."
                    );
                  } else {
                    this.gameSocket.sendChatMessage(
                      "Could not promote " + targets[0] + " to " + perm + "."
                    );
                  }
                } else if (targets.length > 1) {
                  this.gameSocket.sendChatMessage(
                    "Multiple matches found. Please be more specific."
                  );
                } else {
                  this.gameSocket.sendChatMessage("No matches found.");
                }
              }
            } else {
              this.gameSocket.sendChatMessage("Invalid permission");
            }
          } else {
            this.gameSocket.sendChatMessage("Target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?unperm/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic?.isHost &&
          banWhiteListSingle.checkRole(sender, "admin")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            if (target.match(/^\D\S{2,11}#\d{4,8}$/)) {
              if (banWhiteListSingle.removeAdmin(target, sender)) {
                this.gameSocket.sendChatMessage(
                  "Removed perm from out of lobby player: " + target
                );
              } else {
                this.gameSocket.sendChatMessage(
                  "Could not remove perm from out of lobby player: " + target
                );
              }
            } else {
              let targets = this.lobby?.microLobby?.searchPlayer(target);
              if (targets.length === 1) {
                if (banWhiteListSingle.removeAdmin(targets[0], sender)) {
                  this.gameSocket.sendChatMessage(targets[0] + " has been demoted.");
                } else {
                  this.gameSocket.sendChatMessage(targets[0] + " has no permissions.");
                }
              } else if (targets.length > 1) {
                this.gameSocket.sendChatMessage(
                  "Multiple matches found. Please be more specific."
                );
              } else {
                this.gameSocket.sendChatMessage("No matches found.");
              }
            }
          } else {
            this.gameSocket.sendChatMessage("Target required");
          }
        }
      } else if (events.ChatMessage.message.content.match(/^\?autohost/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "admin")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            target = target.toLowerCase();
            if (["off", "rapid", "lobby", "smart"].includes(target)) {
              if (target !== "off") {
                target += "Host";
              }
              this.gameSocket.sendChatMessage("Setting autohost type to: " + target);
              this.settings.updateSettings({
                autoHost: { type: target as AutoHostSettings["type"] },
              });
            } else {
              this.gameSocket.sendChatMessage("Invalid autohost type");
            }
          } else {
            this.gameSocket.sendChatMessage(
              "Autohost current type: " + this.settings.values.autoHost.type
            );
          }
        } else {
          this.gameSocket.sendChatMessage(
            "You do not have permission to use this command."
          );
        }
      } else if (events.ChatMessage.message.content.match(/^\?autostart/i)) {
        if (
          this.lobby?.microLobby?.lobbyStatic.isHost &&
          banWhiteListSingle.checkRole(sender, "admin")
        ) {
          var target = events.ChatMessage.message.content.split(" ")[1];
          if (target) {
            if (isInt(target, 24, 0)) {
              var startTarget = parseInt(target);
              this.gameSocket.sendChatMessage(
                "Setting autostart number to: " + startTarget.toString()
              );
              if (this.settings.values.autoHost.type === "off") {
                this.gameSocket.sendChatMessage("Autohost must be enabled to autostart.");
              }
              this.settings.updateSettings({ autoHost: { minPlayers: startTarget } });
            } else {
              this.gameSocket.sendChatMessage("Invalid autostart number");
            }
          } else {
            this.gameSocket.sendChatMessage(
              "Autostart current number: " + this.settings.values.autoHost.minPlayers
            );
          }
        } else {
          this.gameSocket.sendChatMessage(
            "You do not have permission to use this command."
          );
        }
      } else if (events.ChatMessage.message.content.match(/^\?(help)|(commands)/i)) {
        if (this.lobby?.microLobby?.lobbyStatic.isHost) {
          if (this.lobby?.microLobby?.statsAvailable) {
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
          if (banWhiteListSingle.checkRole(sender, "moderator")) {
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
            this.gameSocket.sendChatMessage("?sp: Shuffles players completely randomly");
            this.gameSocket.sendChatMessage(
              "?st: Shuffles players randomly between teams"
            );
          }
          if (banWhiteListSingle.checkRole(sender, "admin")) {
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
      }
    }
  }

  banPlayer(player: string, admin: string, region: Regions | "client", reason = "") {
    if (this.checkRole(admin, "moderator")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        this.db
          .prepare(
            "INSERT INTO banList (username, admin, region, reason) VALUES (?, ?, ?, ?)"
          )
          .run(player, admin, region, reason);
        this.info("Banned " + player + " by " + admin + (reason ? " for " + reason : ""));
        this.sendWindow({
          messageType: "action",
          data: {
            value: "Banned " + player + " by " + admin + (reason ? " for " + reason : ""),
          },
        });
        if (this.lobby?.microLobby?.allPlayers.includes(player)) {
          this.lobby?.banPlayer(player);
          this.gameSocket.sendChatMessage(
            player + " banned" + (reason ? " for " + reason : "")
          );
        }
      } else {
        this.error("Failed to ban, invalid battleTag: " + player);
      }
    }
  }

  whitePlayer(player: string, admin: string, region: Regions | "client", reason = "") {
    if (this.checkRole(admin, "moderator")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        this.db
          .prepare(
            "INSERT INTO whiteList (username, admin, region, reason) VALUES (?, ?, ?, ?)"
          )
          .run(player, admin, region, reason);
        this.info(
          "Whitelisted " + player + " by " + admin + (reason ? " for " + reason : "")
        );
        this.sendWindow({
          messageType: "action",
          data: {
            value:
              "Whitelisted " + player + " by " + admin + (reason ? " for " + reason : ""),
          },
        });
        if (this.lobby?.microLobby?.allPlayers.includes(player)) {
          this.gameSocket.sendChatMessage(
            player + " whitelisted" + (reason ? " for " + reason : "")
          );
        }
      } else {
        this.error("Failed to whitelist, invalid battleTag: " + player);
      }
    }
  }

  unWhitePlayer(player: string, admin: string) {
    this.db
      .prepare(
        "UPDATE whiteList SET removal_date = DateTime('now') WHERE username = ? AND removal_date IS NULL"
      )
      .run(player);
    this.info("Un-whitelisted " + player + " by " + admin);
    this.sendWindow({
      messageType: "action",
      data: { value: "Un-whitelisted " + player + " by " + admin },
    });
  }

  unBanPlayer(player: string, admin: string) {
    this.db
      .prepare(
        "UPDATE banList SET removal_date = DateTime('now') WHERE username = ? AND removal_date IS NULL"
      )
      .run(player);
    this.info("Unbanned " + player + " by " + admin);
    this.sendWindow({
      messageType: "action",
      data: { value: "Unbanned " + player + " by " + admin },
    });
  }

  addAdmin(
    player: string,
    admin: string,
    region: Regions | "client",
    role: "baswapper" | "swapper" | "moderator" | "admin" = "moderator"
  ) {
    if (this.checkRole(admin, "admin")) {
      if (["baswapper", "swapper", "moderator", "admin"].includes(role)) {
        if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
          if (this.checkRole(player, "moderator")) {
            this.db
              .prepare("UPDATE adminList SET role = ?, admin = ?WHERE username = ?")
              .run(role, admin, player);
            this.info("Updated " + player + " to " + role + " by " + admin);
            this.sendWindow({
              messageType: "action",
              data: {
                value: "Updated " + player + " to " + role + " by " + admin,
              },
            });
            return true;
          } else {
            this.db
              .prepare(
                "INSERT INTO adminList (username, admin, region, role) VALUES (?, ?, ?, ?)"
              )
              .run(player, admin, region, role);
            this.info("Added " + player + " to " + role + " by " + admin);
            this.sendWindow({
              messageType: "action",
              data: {
                value: "Added " + player + " to " + role + " by " + admin,
              },
            });
            return true;
          }
        } else {
          this.info("Failed to add admin, invalid battleTag: " + player);
          return false;
        }
      } else {
        this.info("Failed to add admin, invalid role: " + role);
        return false;
      }
    } else {
      this.info(admin + " is not an admin and can not set perms.");
      return false;
    }
  }

  removeAdmin(player: string, admin: string) {
    if (this.checkRole(admin, "admin")) {
      if (player.match(/^\D\S{2,11}#\d{4,8}$/i)) {
        if (this.checkRole(player, "baswapper")) {
          this.db.prepare("DELETE FROM adminList WHERE username = ?").run(player);
          this.info("Removed permissions from " + player);
          this.sendWindow({
            messageType: "action",
            data: { value: "Removed permissions from " + player },
          });
        } else {
          this.info(player + " is not a moderator");
          return false;
        }
      } else {
        this.error("Failed to remove admin, invalid battleTag: " + player);
        return false;
      }
      return true;
    }
  }

  checkRole(player: string, minPerms: "baswapper" | "swapper" | "moderator" | "admin") {
    if (!player) return false;
    if (player === this.gameState.values.selfBattleTag || player === "client") {
      return true;
    }
    const targetRole = this.db
      .prepare("SELECT role FROM adminList WHERE username = ?")
      .get(player)?.role;
    if (targetRole) {
      if (
        minPerms === "baswapper" &&
        (targetRole === "baswapper" ||
          targetRole === "swapper" ||
          targetRole === "moderator")
      ) {
        return true;
      } else if (
        minPerms === "swapper" &&
        (targetRole === "swapper" || targetRole === "moderator")
      ) {
        return true;
      } else if (minPerms === "moderator" && targetRole === "moderator") {
        return true;
      } else if (targetRole === "admin") {
        return true;
      }
    }
    return false;
  }

  isWhiteListed(player: string): boolean {
    const row = this.db
      .prepare("SELECT * FROM whiteList WHERE username = ? AND removal_date IS NULL")
      .get(player);
    return !!row;
  }

  isBanned(player: string): { reason: string } | null {
    const row = this.db
      .prepare("SELECT * FROM banList WHERE username = ? AND removal_date IS NULL")
      .get(player);
    return row;
  }

  fetchList(options: FetchListOptions) {
    let prep = this.db.prepare(
      `SELECT * FROM ${options.type} ${
        options.activeOnly ? "WHERE removal_date IS NULL" : ""
      } ORDER BY ${options.sort ?? "id"} ${options.sortOrder ?? "ASC"} ${
        options.page !== undefined ? "LIMIT 10 OFFSET ?" : ""
      }`
    );
    if (options.page !== undefined) {
      return prep.all(options.page * 10);
    } else {
      return prep.all();
    }
  }
}

export const banWhiteListSingle = new banWhiteList();
