# WC3 Multi-Tool <!-- omit in toc -->

- [What this tool does](#what-this-tool-does)
- [Limitations](#limitations)
- [What this tool is NOT](#what-this-tool-is-not)
- [What this tool modifies](#what-this-tool-modifies)
- [Development](#development)
  - [Contributing](#contributing)
  - [TODO](#todo)

## What this tool does

1. Auto Host​
    - Instantly host a lobby with desired settings
    - Automatically move to a host/spectator/observer slot
    - Custom announcement on join with custom cool-down
    - Rapid/Smart Host*
        - Starts the game once all non spectator/host/observer team slots are full
        - Vote start
        - Smart: Attempts to quit the game once it is over
          - When the "Quit Mission" dialog pops up
          - If a map uses the included vJass lib, then it watches for a game over command.
        - Rapid: Quits after specified time in minutes.
    - System for Moderator and Admin controls.
2. Join lobbies externally [Demo​](https://www.youtube.com/watch?v=Q4T2N2dFZLY)
    - Join a lobby by clinking on a link outside of Warcraft
      - Also works in conjunction with below Discord Rich presence integration
3. ELO Lookup​
    - Grab the ELO of every player from www.wc3stats.com
        - Optionally announce each players ELO on join
        - Displays ELO of each player in app
    - Auto-balance players: Will figure out the best possible team combination, and figure out the best way to swap players for the least swaps.
        - If host: swap players automatically
        - If player: suggest team combinations
        - Can exclude the host from swaps
4. OBS integration​
    - Swap scene based off game state (Currently In game or Out of game)
    - Get a text list of all players that are/were in the lobby
    - Donation Integration (Stream Elements)​
         - Send donation messages to lobby (In game as well, but not reliable at the moment)
5. Discord Integration​
     - Bidirectional communication with a discord channel
     - Announce new lobbies automatically, and show who is in them and what their ELO is in real time.
     - Rich Presence integration
       - Show current lobby or game in discord, the number of players, and running time, as well as a join button for others to use
6. Auto Translate
    - Translate messages and send them to the integrated discord channel or back to lobby
7. White List/ Black List
     - You can actually permanently ban now instead of per lobby.
     - Alternatively you can create a white list only allowing specified players to join.

## Limitations

- Smart host currently requires the game to be in focus unless the map uses the included vJass lib.
- You have to manually edit index.html to alow both WC3 Multi-Tool and W3C Champions.

## What this tool is NOT

- This tool is not a ghost++ replacement. It is not a scalable hosting solution, as it requires an active game client.
- It can NOT interact with anything while in game reliably.
- It is not an enclosed ELO system. It will not update any ELOs or handle game winners/losers. It can only upload replays to WC3Stats.

## What this tool modifies

This tool adds a registry key to AllowLocalFiles and then modifies both the index.html page and the GlueManager.js file. It creates a websocket connection from the client to the app, and hooks into the underlying game client websocket connection.

## Development

### Contributing

Unfortunately, due to the way WC3 is forced to launch through the BNET launcher (as well as to enable smart host on maps not including the vJass library), some OCR is required to enable launching. To accomplish this, [Nut.js](https://github.com/nut-tree/nut.js) is used. To be able to use a version of electron that is compatible with the current version of [Discord.js,](https://github.com/discordjs/discord.js#installation) the [custom built (and non public) image matcher package Nut.js provides is used.](https://nutjs.dev/blog/new-years-news) It costs 40$ a month, meaning that you most likely may not feel like forking up the cash to be able to build and test on your own. Feel free to make any pull requests and I'll do my best to build it and test it out.

### TODO

- [ ] Refactor the app.ts file
- [ ] Revamp central Hub
  - [ ] Allow signing in for easy remote control
- [ ] Fix connection sometimes not establishing between web page and app
- [ ] Add a way to install both WC3 Champions and WC3 Multi-Tool
