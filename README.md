# WC3 Multi-Tool <!-- omit in toc -->

- [Features](#features)
- [Limitations](#limitations)
- [What this tool is NOT](#what-this-tool-is-not)
- [What this tool modifies](#what-this-tool-modifies)
- [Installing](#installing)
- [Setup](#setup)
  - [OBS Integration](#obs-integration)
  - [Discord Integration](#discord-integration)
  - [Using the External Lobby](#using-the-external-lobby)
- [Development](#development)
  - [Contributing](#contributing)
    - [License](#license)
    - [Bad News](#bad-news)
    - [Additional Modules](#additional-modules)
  - [TODO](#todo)

## Features

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
8. Auto-update
    - Automatically update the app

## Limitations

- Smart host currently requires the game to be in focus unless the map uses the included vJass lib.
- You have to manually edit index.html to alow both WC3 Multi-Tool and W3C Champions.
- There is extremely limited in game interaction.

## What this tool is NOT

- This tool is not a ghost++ replacement. It is not a scalable hosting solution, as it requires an active game client.
- It can NOT interact with anything while in game reliably.
- It is not an enclosed ELO system. It will not update any ELOs or handle game winners/losers. It can only upload replays to WC3Stats.

## What this tool modifies

This tool adds a registry key to AllowLocalFiles and then modifies both the index.html page and the GlueManager.js file. It creates a websocket connection from the client to the app, and hooks into the underlying game client websocket connection.

## Installing

You can grab a download for the tool at either [Hive](https://www.hiveworkshop.com/threads/wc3-multi-tool.335492/) or [the hub site](https://war.trenchguns.com/) (You may need to Ctrl + Shift + R to initiate the download until the revamp hub is finished). The tool will automatically update itself as needed.

- If you run into an error on open, you may need to manually install the [Microsoft C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
- If you are running this on a VM with no audio device, it is recommended to install a [virtual audio device](https://vb-audio.com/Cable/) otherwise Warcraft will show an error on start.

## Setup

### OBS Integration

OBS Websockets (Recommended)

- [Download and install the latest full release from the Github repo](https://github.com/obsproject/obs-websocket/releases)
- If OBS is running locally and the port is unchanged leave the OBS address blank and use the default address.
- Input the password if you specified any
- Input the desired scene names (Case sensitive)

Simulate Hotkeys

- Set up the hotkeys for each desired scene within OBS and the App

Text Source

- `wc3mt.txt` will be placed within your documents folder containing the team structure in plaintext. You can import that into OBS

### Discord Integration

1. Sign into the [Discord Developer page](https://discord.com/developers/applications)
2. Create a new application
3. Create a new bot.
4. Under OAuth2 generate a new URL with the bot scope and the following permissions:
![image](https://user-images.githubusercontent.com/72752967/183981096-902f4ae3-d0e4-4d59-9001-cd601f521b60.png)
5. Copy over the token into the app
6. Set the name or ID of each channel. They are all optional. If you wish to use a separate channel for one continuous lobby chat, uncheck "Use Threads For Chat". The admin channel will let participants use admin commands in it and show everyone what is executed. The admin role will let users use admin commands throughout the server, but the execution of commands will only be visible to the executor. The announce channel will show the current lobby (and potential lobby chat threads). If Use Threads is disabled then the lobby chat channel will be one continuous channel for lobby chat.

### Using the External Lobby

## Development

### Contributing

#### License

As of right now there is no license to the project. The below notes are for when the project eventually gets a license.

#### Bad News

Unfortunately, due to the way WC3 is forced to launch through the BNET launcher (as well as to enable smart host on maps not including the vJass library), some image matching is required to enable launching. To accomplish this, [Nut.js](https://github.com/nut-tree/nut.js) is used. To be able to use a version of electron that is compatible with the current version of [Discord.js,](https://github.com/discordjs/discord.js#installation) the [custom built (and non public) image matcher package Nut.js provides is used.](https://nutjs.dev/blog/new-years-news) It costs 40$ a month, meaning that you most likely may not feel like forking up the cash to be able to build and test on your own. Feel free to make any pull requests and I'll do my best to build it and test it out.

#### Additional Modules

Each add-on is a designed as a separate "module" under `./tsrc/modules`.
[View the README here](tsrc/modules/README.md)

### TODO

- [ ] Refactor the app.ts file
- [ ] Revamp central Hub
  - [ ] Allow signing in for easy remote control
- [ ] Fix connection sometimes not establishing between web page and app
- [ ] Add a way to install both WC3 Champions and WC3 Multi-Tool
