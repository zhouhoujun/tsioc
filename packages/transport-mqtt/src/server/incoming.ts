import { MqttClient } from 'mqtt';
import { MessageIncoming } from '@tsdi/transport';


export class MqttIncoming extends MessageIncoming<MqttClient> {

}
