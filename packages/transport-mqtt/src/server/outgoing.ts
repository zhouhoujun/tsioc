import { TransportSession, HeaderPacket } from '@tsdi/core';
import { MessageOutgoing } from '@tsdi/platform-server-transport';
import { MqttClient } from 'mqtt';



/**
 * outgoing message.
 */
export class MqttOutgoing extends MessageOutgoing<MqttClient, number> {

    constructor(
        session: TransportSession<MqttClient>,
        id: number,
        topic: string) {
        super(session, id, topic, '');
    }


    override createHeaderPacket(): HeaderPacket {
        const topic = this.getReply(this.topic);
        return {
            id: this.id,
            topic,
            headers: this.getHeaders()
        };
    }

    getReply(topic: string) {
        return topic + '/reply';
    }

}
