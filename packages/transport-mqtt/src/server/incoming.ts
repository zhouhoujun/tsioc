import { MqttClient } from 'mqtt';
import { MessageIncoming } from '@tsdi/platform-server-transport';


export class MqttIncoming extends MessageIncoming<MqttClient> {

}
