import {ensureInt} from '../utility';
import type {
  MicroLobbyData,
  PlayerData,
  PlayerPayload,
  PlayerTeamsData,
} from 'wc3mt-lobby-container';
import {MicroLobby} from 'wc3mt-lobby-container';
import {Combination, Permutation} from 'js-combinatorics';

function lobbyCombinations(
  target: Array<string>,
  playerData: {
    [key: string]: PlayerData;
  },
  teamSize: number,
) {
  // @ts-expect-error This is a false error
  const combos: Array<Array<string>> = new Permutation(target);
  let bestCombo: Array<Array<string>> = [];
  let smallestEloDiff = Number.POSITIVE_INFINITY;

  const totalElo = Object.values(playerData).reduce(
    (a, b) => (b.extra?.rating ? a + ensureInt(b.extra.rating) : a),
    0,
  );

  // First generate every permutation, then separate them into groups of the required team size
  for (const combo of combos) {
    const coupled: Array<Array<string>> = combo.reduce(
      (resultArray: string[][], item: string, index: number) => {
        const chunkIndex = Math.floor(index / teamSize);

        if (!resultArray[chunkIndex]) {
          resultArray[chunkIndex] = []; // start a new chunk
        }

        resultArray[chunkIndex].push(item);

        return resultArray;
      },
      [],
    );
    // Now that we have each team in a chunk, we can calculate the elo difference
    let largestEloDifference = -1;
    for (const combo of coupled) {
      // Go through each possible team of the chunk and calculate the highest difference in elo to the target average(totalElo/numTeams)
      const comboElo = combo.reduce(
        (a: number, b: string) => a + (playerData[b].extra?.rating ?? 500),
        0,
      );
      const eloDiff = Math.abs(totalElo / (target.length / teamSize) - comboElo);
      // If the difference is larger than the current largest difference, set it as the new largest
      if (eloDiff > largestEloDifference) {
        largestEloDifference = eloDiff;
      }
    }
    // If the previously calculated difference is smaller than the current smallest difference, set it as the new smallest, and save the combo
    if (largestEloDifference < smallestEloDiff) {
      smallestEloDiff = largestEloDifference;
      bestCombo = coupled;
    }
  }
  return bestCombo;
}

function intersect(a: Array<string>, b: Array<string>) {
  const setB = new Set(b);
  return [...new Set(a)].filter(x => setB.has(x));
}

export function generateAutoBalance(
  data: PlayerTeamsData | false,
  nonSpecPlayers: Array<string>,
  excludeHostFromSwap: string | false,
  fullData: MicroLobbyData | false,
):
  | {
      error?: string;
      twoTeams?: {
        bestCombo: Array<string>;
        team1Swaps: Array<string>;
        team2Swaps: Array<string>;
        leastSwapTeam: string;
        eloDiff: number;
      };
      moreTeams?: {swaps: Array<[string, string]>; bestCombo: Array<Array<string>>};
    }
  | true {
  if (!data) {
    return {error: 'Can not autobalance with empty teams'};
  }
  const teams = Object.entries(data).filter(
    // Filter out empty teams
    ([_, teamPlayers]) => Object.values(teamPlayers).filter(player => player.realPlayer).length > 0,
  );
  const combinedPlayers = (
    [] as {
      name: string;
      slotStatus: 0 | 1 | 2;
      slot: number;
      realPlayer: boolean;
      data: PlayerData;
    }[]
  ).concat(...Object.values(data));
  const playerData: {
    [key: string]: PlayerData;
  } = {};
  combinedPlayers.forEach(player => {
    playerData[player.name] = player.data;
  });
  if (teams.length < 2) {
    return true;
  } else if (teams.length === 2) {
    let leastSwapTeam = 'Team ?';
    const players = Object.entries(playerData).filter(
      x => x[1].extra && nonSpecPlayers.includes(x[0]),
    );
    const totalElo = players.reduce(
      (a, b) => (b[1].extra?.rating ? a + ensureInt(b[1].extra.rating) : a),
      0,
    );
    let smallestEloDiff = Number.POSITIVE_INFINITY;
    let bestCombo: Array<string> = [];
    // @ts-expect-error This is a false error
    const combos: Array<Array<string>> = new Combination(
      players.map(player => player[0]),
      Math.floor(players.length / 2),
    );
    for (const combo of combos) {
      const comboElo = combo.reduce((a, b) => a + ensureInt(playerData[b].extra?.rating ?? 500), 0);
      const eloDiff = Math.abs(totalElo / 2 - comboElo);
      if (eloDiff < smallestEloDiff) {
        smallestEloDiff = eloDiff;
        bestCombo = combo;
      }
    }
    const swapsFromTeam1: Array<string> = [];
    const swapsFromTeam2: Array<string> = [];
    const bestComboInTeam1 = intersect(
      bestCombo,
      teams[0][1].filter(player => player.realPlayer).map(player => player.name),
    );
    const bestComboInTeam2 = intersect(
      bestCombo,
      teams[1][1].filter(player => player.realPlayer).map(player => player.name),
    );
    // If not excludeHostFromSwap and team1 has more best combo people, or excludeHostFromSwap and the best combo includes the host keep all best combo players in team 1.
    if (
      (!excludeHostFromSwap && bestComboInTeam1.length >= bestComboInTeam2.length) ||
      (excludeHostFromSwap && bestCombo.includes(excludeHostFromSwap || ''))
    ) {
      // Go through team 1 and grab everyone who is not in the best combo
      leastSwapTeam = teams[0][0];
      teams[0][1].forEach(user => {
        if (user.realPlayer && !(bestCombo as Array<string>).includes(user.name)) {
          swapsFromTeam1.push(user.name);
        }
      });
      // Go through team 2 and grab everyone who is in the best combo
      bestComboInTeam2.forEach(function (user) {
        swapsFromTeam2.push(user);
      });
    } else {
      leastSwapTeam = teams[1][0];
      teams[1][1].forEach(user => {
        if (user.realPlayer && !(bestCombo as Array<string>).includes(user.name)) {
          swapsFromTeam2.push(user.name);
        }
      });
      bestComboInTeam1.forEach(function (user) {
        swapsFromTeam1.push(user);
      });
    }
    return {
      twoTeams: {
        bestCombo,
        team1Swaps: swapsFromTeam1,
        team2Swaps: swapsFromTeam2,
        leastSwapTeam,
        eloDiff: smallestEloDiff,
      },
    };
  } else {
    if (!fullData) {
      return {error: 'Full microLobby data is needed'};
    }
    // TODO: There may be an issue if the teams are already balanced.
    const buildSwaps: Array<[string, string]> = [];
    const bestCombo = lobbyCombinations(
      nonSpecPlayers,
      playerData,
      // Just grab the size of the first team
      teams[0][1].filter(player => player.realPlayer).length,
    );
    const lobbyCopy = new MicroLobby({fullData}, false);
    const playerTeams = Object.entries(lobbyCopy.teamListLookup)
      .filter(([_, teamData]) => teamData.type === 'playerTeams')
      .map(data => data[0]);
    for (let i = 0; i < bestCombo.length; i++) {
      // For each Team
      let currentTeam: Array<PlayerPayload>;
      for (let x = 0; x < bestCombo[i].length; x++) {
        currentTeam = Object.values(lobbyCopy.slots).filter(
          player => ensureInt(player.team) === ensureInt(playerTeams[i]),
        );
        // For each player in the team
        const targetPlayer = bestCombo[i][x];
        // If the team does not include the target player, check through the team for an incorrect player and swap them
        if (currentTeam.find(player => player.name === targetPlayer) === undefined) {
          for (const currentPlayer of currentTeam) {
            if (!bestCombo[i].includes(currentPlayer.name)) {
              buildSwaps.push([currentPlayer.name, targetPlayer]);
              // Swap the data of the two players
              const targetPlayerOldSlot = lobbyCopy.playerToSlot(targetPlayer);
              const targetPlayerOldData = lobbyCopy.slots[targetPlayerOldSlot];
              const currentPlayerSlot = currentPlayer.slot;
              // Only swapping the team number is really required since the slot number information is doubled as the key for the slot, but still swapped just in case.
              // Set the slot info for the current player to the info that it is being swapped to
              currentPlayer.team = targetPlayerOldData.team;
              currentPlayer.slot = targetPlayerOldData.slot;
              // Set the slot info for the target player to the info that it is being swapped to
              targetPlayerOldData.team = ensureInt(playerTeams[i]);
              targetPlayerOldData.slot = currentPlayerSlot;
              // Set the slots to their new data.
              lobbyCopy.slots[currentPlayer.slot] = targetPlayerOldData;
              lobbyCopy.slots[targetPlayerOldSlot] = currentPlayer;
              break;
            }
          }
        }
      }
    }
    return {moreTeams: {swaps: buildSwaps, bestCombo}};
  }
}
