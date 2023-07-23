import { MessageIncoming } from '@tsdi/platform-server-transport';
import { Socket } from 'dgram';

export class UdpIncoming extends MessageIncoming<Socket> {

}
