import Store from "electron-store";

const store = new Store();

import { nanoid } from "nanoid";

var id: string = store.get("anonymousIdentifier") as string;
if (!id || id.length !== 21) {
  id = nanoid();
  store.set("anonymousIdentifier", id);
}

export const identifier = id;
