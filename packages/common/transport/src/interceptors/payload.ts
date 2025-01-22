import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { PacketLengthException } from '../execptions';
import { IDuplex } from '../stream';
import { IncomingMessage } from '../Incoming';
import { OutgoingMessage } from '../Outgoing';
import { TransportContext } from '../context';
import { AbstractTransport } from '../transports';
import { isBuffer } from '../StreamAdapter';
import { Packet } from '../socket';



@Injectable()
export class PacketDeserializeInterceptor implements Interceptor<Packet, IncomingMessage, TransportContext> {

    protected packets: Map<string | number, Packet<IDuplex>>;

    constructor() {
        this.packets = new Map();
    }

    intercept(input: Packet<IDuplex>, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (!input.payload) return next.handle(input, context);

        const transport = context.transport as AbstractTransport;
        const opts = transport.options;
        const idLen = opts.idLen ?? 2;
        let id: string | number;

        if (context.transport.streamAdapter.isReadable(input.payload)) {
            const chunk = input.payload.read(idLen);
            const id = idLen > 4 ? chunk.subarray(0, idLen).toString() : chunk.readUIntBE(0, idLen);
            if (this.packets.has(id)) {
                const packet = this.packets.get(id)!;
                if (packet.payload) {
                    // packet.payload.pipe = Buffer.concat([packet.payload, input.payload]);
                } else {
                    packet.payload = input.payload;
                }
            } else {
                // input.payload.unread(idLen);
                return next.handle(input, context);
            }
        }

        return next.handle(input, context)
            .pipe(
                filter(pkg => {
                    
                    if (!pkg.body) {
                        return false;
                    }
                    return true;
                }))

    }

}
