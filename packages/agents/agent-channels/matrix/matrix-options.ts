export interface MatrixAgentChannelOptions {
    homeserverUrl?: string;
    accessToken?: string;
    userId?: string;
    deviceId?: string;
    allowedRoomIds?: string[];
    defaultRecipient?: string;
}

export const defaultMatrixAgentChannelOptions: MatrixAgentChannelOptions = {};
