import { MessageIncoming } from '@tsdi/transport';
import { Duplex } from 'stream';

export class WsIncoming extends MessageIncoming<Duplex> {

}
