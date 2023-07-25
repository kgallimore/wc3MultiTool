import { generateAutoBalance } from "./modules/autoBalancer";
import { PlayerTeamsData, PlayerData } from "wc3mt-lobby-container";
var playerTeamsData: PlayerTeamsData = {
  team1: [
    {
      name: "suken",
      slotStatus: 1,
      slot: 0,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 2158, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "tod",
      slotStatus: 1,
      slot: 1,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1467, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "farbheit",
      slotStatus: 1,
      slot: 2,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1196, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "reprobate",
      slotStatus: 1,
      slot: 3,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1172, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "megaboss",
      slotStatus: 1,
      slot: 4,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1030, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
  ],
  team2: [
    {
      name: "public",
      slotStatus: 1,
      slot: 5,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1569, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "pinok",
      slotStatus: 1,
      slot: 6,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1445, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "shadowstorm",
      slotStatus: 1,
      slot: 7,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1349, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "reformed",
      slotStatus: 1,
      slot: 8,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1121, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
    {
      name: "fran",
      slotStatus: 1,
      slot: 9,
      realPlayer: true,
      data: {
        joinedAt: Date.now(),
        cleared: true,
        extra: { rating: 1000, played: 10, wins: 10, losses: 0, rank: 1, lastChange: 10 },
      },
    },
  ],
};
var nonSpecPlayers = (
  [] as {
    name: string;
    slotStatus: 0 | 1 | 2;
    slot: number;
    realPlayer: boolean;
    data: PlayerData;
  }[]
)
  .concat(...Object.values(playerTeamsData))
  .map((player) => player.name);
var combinedPlayers = (
  [] as {
    name: string;
    slotStatus: 0 | 1 | 2;
    slot: number;
    realPlayer: boolean;
    data: PlayerData;
  }[]
).concat(...Object.values(playerTeamsData));
var playerData: {
  [key: string]: PlayerData;
} = {};
combinedPlayers.forEach((player) => {
  playerData[player.name] = player.data;
});
var autoBalance = generateAutoBalance(playerTeamsData, nonSpecPlayers, false, false);
if (autoBalance == true) {
  console.log("Already balanced");
} else {
  if (autoBalance.twoTeams) {
    var bestComboElo = autoBalance.twoTeams.bestCombo.reduce(
      (prev, current) => prev + (playerData[current].extra?.rating ?? 0),
      0
    );
    var totalElo = Object.values(playerData).reduce(
      (prev, current) => prev + (current.extra?.rating ?? 0),
      0
    );
    console.log(autoBalance.twoTeams.bestCombo);
    console.log(
      "Total Elo: ",
      totalElo,
      "BestComboElo: ",
      bestComboElo,
      "Difference: ",
      totalElo - bestComboElo
    );
  }
}
