const fs = require("fs");
let replay =
  "C:\\Users\\Trenchguns\\Documents\\Warcraft III\\BattleNet\\84572134\\Replays\\LastReplay.w3g";

//C:\Users\Trenchguns\Documents\Warcraft III\BattleNet\84572134\Replays\LastReplay.w3g
let form = new FormData();
form.append("replay", new Blob([fs.readFileSync(replay)]));
fetch(`https://api.wc3stats.com/upload?auto=true`, {
  method: "POST",
  body: form,
}).then(
  (response) => {
    if (!response.ok) {
      console.log("Failed", JSON.stringify(response));
    } else {
      console.log("Uploaded replay to wc3stats");
    }
  },
  (error) => {
    console.log(error.message);
  }
);
