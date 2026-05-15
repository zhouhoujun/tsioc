export interface SignalAgentChannelOptions {
    phoneNumber?: string;
    signalCliPath?: string;
    baseUrl?: string;
    allowedUserIds?: string[];
    defaultRecipient?: string;
}

export const defaultSignalAgentChannelOptions: SignalAgentChannelOptions = {
    signalCliPath: 'signal-cli',
    baseUrl: 'http://localhost:8080'
};
