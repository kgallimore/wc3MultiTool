import { GameSocketEvents } from "./../globals/gameSocket";
import { ModuleBase } from "./../moduleBase";

const translate = require("translate-google");
import LanguageDetect from "languagedetect";
let detectLang = new LanguageDetect();
detectLang.setLanguageType("iso2");

class ChatHandler extends ModuleBase {
  protected async onGameSocketEvent(events: GameSocketEvents): Promise<void> {
    if (events.ChatMessage) {
      if (
        events.ChatMessage.message?.sender &&
        events.ChatMessage.message.source === "gameChat"
      ) {
        if (events.ChatMessage.message.sender.includes("#")) {
          var sender = events.ChatMessage.message.sender;
        } else if (
          this.gameState.values.selfBattleTag
            .toLowerCase()
            .includes(events.ChatMessage.message.sender)
        ) {
          var sender = this.gameState.values.selfBattleTag;
        } else {
          let possiblePlayers = this.lobby.microLobby?.searchPlayer(
            events.ChatMessage.message.sender
          );
          if (possiblePlayers && possiblePlayers.length === 1) {
            var sender = possiblePlayers[0];
          } else {
            this.error(
              `Unknown sender: ${events.ChatMessage.message.sender} for message: ${events.ChatMessage.message.content}`
            );
            return;
          }
        }
        if (sender === this.gameState.values.selfBattleTag) {
          if (this.gameSocket.sentMessages.includes(events.ChatMessage.message.content)) {
            this.gameSocket.sentMessages.splice(
              this.gameSocket.sentMessages.indexOf(events.ChatMessage.message.content),
              1
            );
            return;
          } else if (
            events.ChatMessage.message.content.match(
              /^((\d{1,2}: (\[Closed]|\[Open]))|(Map Upload (Started|Offset|Complete): \d+)|(Name: ((([A-zÀ-ú][A-zÀ-ú0-9]{2,11})|(^([а-яёА-ЯЁÀ-ú][а-яёА-ЯЁ0-9À-ú]{2,11})))(#[0-9]{4,})|\w{2,11}), Key: (?:[0-9]{1,3}\.){3}[0-9]{1,3}))$/
            )
          ) {
            // Escape debug messages
            return;
          } else if (
            events.ChatMessage.message.content.match(
              /^(executed '!)|(Unknown command ')|(Command ')/i
            )
          ) {
            // Filter out some command returns from !swap etc
            return;
          }
        }
        // Message has a sender and is probably not a debug message.
        if (!this.lobby.microLobby?.newChat(sender, events.ChatMessage.message.content)) {
          // Filter out repeated messages sent w/in 1 second
          // TODO: more spam filters
          return;
        }
        {
          if (
            sender !== this.gameState.values.selfBattleTag &&
            events.ChatMessage.message.content.match(/^!debug/)
          ) {
            this.lobby.banPlayer(sender);
          }
          var translatedMessage = "";
          if (events.ChatMessage.message.content.length > 4) {
            var detectLangs = detectLang.detect(events.ChatMessage.message.content, 1);
            console.log(detectLangs);
            if (
              this.settings.values.client.language &&
              !events.ChatMessage.message.content.startsWith("?") &&
              (!detectLangs ||
                detectLangs.length === 0 ||
                (![this.settings.values.client.language, null, "null"].includes(
                  detectLangs[0][0]
                ) &&
                  detectLangs[0][1] > 0.3))
            ) {
              this.verbose("Translating '" + events.ChatMessage.message.content);
              try {
                translatedMessage = await translate(events.ChatMessage.message.content, {
                  to: this.settings.values.client.language,
                });
                if (
                  translatedMessage.toLowerCase() ===
                  events.ChatMessage.message.content.toLowerCase()
                ) {
                  translatedMessage = "";
                }
              } catch (e) {
                this.error(e);
              }
            }
          }

          if (this.settings.values.client.translateToLobby && translatedMessage) {
            this.gameSocket.sendChatMessage(sender + ": " + translatedMessage);
          }
          this.emitProcessedChat({
            sender,
            content: events.ChatMessage.message.content,
            source: "gameChat",
            translated: translatedMessage,
          });
        }
      }
    }
  }
}

export const chatHandler = new ChatHandler();
