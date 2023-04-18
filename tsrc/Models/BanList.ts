import { Table, Model, Column } from "sequelize-typescript";
import type { Regions } from "wc3mt-lobby-container";

@Table({ tableName: "banList", freezeTableName: true })
export class BanList extends Model<BanList> {
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
