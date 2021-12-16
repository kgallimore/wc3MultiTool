require = require("esm")(module);
var { Combination, Permutation } = require("js-combinatorics");
let playerData: { [key: string]: { elo: number; games: number } } = {
  Trenchguns: { elo: 600, games: 10 },
  Trenchwarfare: { elo: 550, games: 10 },
  Trenchwarfare2: { elo: 530, games: 10 },
  Trenchwarfare3: { elo: 500, games: 10 },
  Trenchwarfare4: { elo: 475, games: 10 },
  Trenchwarfare5: { elo: 450, games: 10 },
};
let totalElo = 500 + 500 + 540 + 560 + 480 + 555;
let teamList = {
  playerTeams: {
    data: {
      team1: {
        players: ["Trenchguns", "Trenchwarfare"],
        number: "1",
        slots: ["Trenchguns", "Trenchwarfare"],
        totalSlots: 2,
        defaultOpenSlots: 1,
      },
      team2: {
        players: ["Trenchwarfare2", "Trenchwarfare3"],
        number: "2",
        slots: ["Trenchwarfare2", "Trenchwarfare3"],
        totalSlots: 2,
        defaultOpenSlots: 1,
      },
      team4: {
        players: ["Trenchwarfare4", "Trenchwarfare5"],
        number: "4",
        slots: ["Trenchwarfare4", "Trenchwarfare5"],
        totalSlots: 2,
        defaultOpenSlots: 1,
      },
    },
  },
};
console.log(combinations(Object.keys(playerData)));

function combinations(target: Array<any>, teamSize: number = 3) {
  let combos = new Permutation(target);
  let bestCombo = [];
  let smallestEloDiff = Number.POSITIVE_INFINITY;
  // First generate every permutation, then separate them into groups of the required team size
  for (const combo of combos) {
    let coupled = combo.reduce((resultArray: any[][], item: any, index: number) => {
      const chunkIndex = Math.floor(index / teamSize);

      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = []; // start a new chunk
      }

      resultArray[chunkIndex].push(item);

      return resultArray;
    }, []);
    // Now that we have each team in a chunk, we can calculate the elo difference
    let largestEloDifference = -1;
    for (const combo of coupled) {
      // Go through each possible team of the chunk and calculate the highest difference in elo to the target average(totalElo/numTeams)
      const comboElo = combo.reduce((a: number, b: string) => a + playerData[b].elo, 0);
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
