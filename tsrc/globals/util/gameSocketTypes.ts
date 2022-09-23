export interface OnChannelJoinChannel {
  name: string;
  displayName: string;
  channelId: string;
  auroraId: number;
  channelNumber: number;
  channelType: number;
  members?: OnChannelJoinMembersEntity[] | null;
  isConnected: boolean;
  source: string;
}
export interface OnChannelJoinMembersEntity {
  id: string;
  name: string;
  status: number;
  avatarId: string;
  isSquelched: boolean;
}
