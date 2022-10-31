import { ev } from '../consts';
import { IncomingMessage } from '../incoming';
import { OutgoingMessage } from '../outgoing';

export class Request extends OutgoingMessage {

    protected override init(): void {
        super.init();
        let incoming: IncomingMessage;
        // this.connection.on(ev.DATA, (data) => {
        //     if (data.id == this.id) {
        //         if (incoming) {
        //             incoming.write(data.body)
        //         } else {
        //             incoming = new IncomingMessage(this.connection, data.headers);
        //             this.emit(ev.RESPONSE, incoming);
        //         }
        //     }
        // })
    }
}