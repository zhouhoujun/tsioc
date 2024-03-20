import { Abstract, Injector } from '@tsdi/ioc';
import { Decoder, Encoder, TransportEvent, TransportRequest } from '@tsdi/common';
import { TransportOpts, TransportSession } from '@tsdi/common/transport';
import { Observable, map, mergeMap, of } from 'rxjs';

@Abstract()
export abstract class ClientTransportSession<TMsg = any, TSocket = any> extends TransportSession<TransportRequest, TMsg, TSocket> {

    abstract get encodings(): Encoder[];
    abstract get decodings(): Decoder[];

    // send(input: TransportRequest): Observable<TMsg> {
    //     return this.encodings.reduceRight((obs$, curr) => {
    //         return obs$.pipe(
    //             mergeMap(input => curr.encode(input))
    //         );
    //     }, of(input))
    //         .pipe(mergeMap(msg => this.sendMessage(input, msg as TMsg)))
    // }

    // abstract sendMessage(input: TransportRequest, msg: TMsg): Observable<TMsg>;

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

/**
 * transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TMsg = any, TSocket = any> {
    /**
     * create transport session.
     * @param options 
     */
    abstract create(injector: Injector, socket: TSocket, options: TransportOpts): ClientTransportSession<TMsg, TSocket>;
}
