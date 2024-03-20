import { Abstract } from '@tsdi/ioc';
import { Decoder, Encoder, TransportEvent, TransportRequest } from '@tsdi/common';
import { TransportSession } from '@tsdi/common/transport';
import { Observable, map, mergeMap, of } from 'rxjs';

@Abstract()
export abstract class ClientTransportSession<TMsg = any> extends TransportSession<TransportRequest, TMsg> {

    abstract get encodings(): Encoder[];
    abstract get decodings(): Decoder[];

    send(input: TransportRequest): Observable<TMsg> {
        return this.encodings.reduceRight((obs$, curr) => {
            return obs$.pipe(
                mergeMap(input => curr.encode(input))
            );
        }, of(input))
            .pipe(mergeMap(msg => this.sendMessage(input, msg as TMsg)))
    }

    abstract sendMessage(input: TransportRequest, msg: TMsg): Observable<TMsg>;

    request(req: TransportRequest): Observable<TransportEvent> {
        return this.send(req)
            .pipe(
                mergeMap(msg => this.receive(msg)),
                mergeMap(msg => this.decodings.reduceRight((obs$, curr) => {
                    return obs$.pipe(
                        mergeMap(input => curr.decode(input))
                    );
                }, of(msg))),
                map(res => res as any)
            )
    }



}