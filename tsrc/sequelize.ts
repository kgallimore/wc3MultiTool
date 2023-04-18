import { Sequelize } from "sequelize-typescript";
import { app } from "electron";

export const seq = new Sequelize({
  dialect: "sqlite",
  storage: app.getPath("userData") + "/wc3mt.db",
  models: [__dirname + "./models"],
});
