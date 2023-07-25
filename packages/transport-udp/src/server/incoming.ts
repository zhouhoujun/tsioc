import { MessageIncoming } from '@tsdi/transport';
import { Socket } from 'dgram';

export class UdpIncoming extends MessageIncoming<Socket> {

}
