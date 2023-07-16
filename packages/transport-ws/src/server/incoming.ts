import { MessageIncoming } from '@tsdi/platform-server-transport';
import { Duplex } from 'stream';

export class WsIncoming extends MessageIncoming<Duplex> {

}
