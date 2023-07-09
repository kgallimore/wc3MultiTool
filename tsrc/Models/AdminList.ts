import { Table, Model, Column } from "sequelize-typescript";
import { AdminRoles } from "../modules/administration";
import type { Regions } from "wc3mt-lobby-container";

@Table({ tableName: "adminList", freezeTableName: true })
export class AdminList extends Model {
  @Column
  username: string;

  @Column
  admin: string;

  @Column
  region: Regions | "client";

  @Column
  role: AdminRoles;
}
