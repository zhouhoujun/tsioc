import { ev } from '../consts';
import { IncomingMessage } from '../incoming';
import { OutgoingMessage } from '../outgoing';

export class RequestStream extends OutgoingMessage {

    protected override init(): void {
        super.init();
        let incoming: IncomingMessage;
        this.connection.on(ev.DATA, (data) => {
            if (data.id == this.id) {
                if (incoming) {
                    incoming.push(data.body)
                } else {
                    incoming = new IncomingMessage(this.id, this.connection, data.headers);
                    this.emit(ev.RESPONSE, incoming);
                }
            }
        })
    }
}
