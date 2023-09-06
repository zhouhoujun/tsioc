import { TransportSession, MessageOutgoing, SendPacket } from '@tsdi/transport';
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


    override createSentPacket(): SendPacket {
        const topic = this.getReply(this.topic);
        return {
            packet: {
                id: this.id,
                topic,
                headers: this.getHeaders()
            }
        };
    }

    getReply(topic: string) {
        return topic + '/reply';
    }

}
