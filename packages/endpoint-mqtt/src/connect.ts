import { IClientOptions } from 'mqtt';

export interface MqttConnectOpts extends IClientOptions {
    url?: string;
}
