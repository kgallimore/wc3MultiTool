import { Table, Model, Column } from "sequelize-typescript";
import type { Regions } from "wc3mt-lobby-container";

@Table({ tableName: "whiteList", freezeTableName: true })
export class WhiteList extends Model<WhiteList> {
  @Column({ primaryKey: true })
  id: number;

  @Column
  username: string;

  @Column
  admin: string;

  @Column
  region: Regions | "client";

  @Column
  reason: string;

  @Column({ allowNull: true })
  removal_date: Date | null;

  @Column
  add_date: Date;
}
