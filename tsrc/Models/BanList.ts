import { Table, Model, Column, AutoIncrement, DataType } from "sequelize-typescript";
import type { Regions } from "wc3mt-lobby-container";

@Table({ tableName: "banList", freezeTableName: true })
export class BanList extends Model {
  @Column
  username: string;

  @Column
  admin: string;

  @Column
  region: Regions | "client";

  @Column
  reason: string;

  @Column({ allowNull: true, type: DataType.DATE })
  removal_date: Date | null;
}