import { Module } from "./../moduleBase";

import { Regions } from "wc3mt-lobby-container";
import sqlite3 from "better-sqlite3";
import { app } from "electron";

import Store from "electron-store";
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
          this.sendGameChat(player + " banned" + (reason ? " for " + reason : ""));
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
          this.sendGameChat(player + " whitelisted" + (reason ? " for " + reason : ""));
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
