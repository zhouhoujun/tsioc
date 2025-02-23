import { IClientOptions } from 'mqtt';

export interface MqttConnectOpts extends IClientOptions {
    /**
     * mqtt broker url
     */
    url?: string;
}
