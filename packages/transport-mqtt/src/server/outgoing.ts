import { HeaderPacket } from '@tsdi/common';
import { TransportSession, MessageOutgoing } from '@tsdi/transport';
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


    override createSentPacket(): HeaderPacket {
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
