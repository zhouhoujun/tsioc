import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { TransportRequest } from '@tsdi/common';
import { Decoder, Encoder, DecodingsFactory, EncodingsFactory, IDuplexStream, TransportOpts, StreamAdapter, IReadableStream, CodingsContext, IWritableStream, NotImplementedExecption, IEventEmitter, ev, isBuffer } from '@tsdi/common/transport';
import { ClientTransportSession, ClientTransportSessionFactory } from './session';
import { Observable, fromEvent, takeUntil } from 'rxjs';



export class DefaultClientTransportSession extends ClientTransportSession<any> {

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly encodings: Encoder,
        readonly decodings: Decoder,
        readonly streamAdapter: StreamAdapter,
        readonly options: TransportOpts

    ) {
        super()
    }

    /**
     * send message.
     * @param originMsg 
     * @param encodedMsg 
     * @param context 
     * @returns 
     */
    protected async sendMessage(data: any, encodedMsg: Buffer | IReadableStream, originMsg: TransportRequest, context: CodingsContext): Promise<any> {
        if (this.streamAdapter.isReadable(data)) {
            if (this.options.pipeTo) {
                await this.options.pipeTo(this.socket, data, originMsg, context)
            } else if (this.options.write) {
                await this.streamAdapter.write(data, this.streamAdapter.createWritable({
                    write: (chunk, encoding, callback) => {
                        this.options.write!(this.socket, chunk, originMsg, context, callback)
                    }
                }))
            } else if ((this.socket as IWritableStream).write) {
                await this.streamAdapter.write(data, this.socket as IWritableStream)
            } else {
                throw new NotImplementedExecption('Can not write message to socket!')
            }
        } else {
            if (this.options.write) {
                await promisify<any, any, any, CodingsContext, void>(this.options.write, this.options)(this.socket, data, originMsg, context)
            } else if ((this.socket as IWritableStream).write) {
                await promisify<any, void>((this.socket as IWritableStream).write, this.socket)(data)
            } else {
                throw new NotImplementedExecption('Can not write message to socket!')
            }
        }
        return data;

    }

    /**
     * handle message
     */
    protected handleMessage(context?: CodingsContext): Observable<any> {
        if (this.options.handleMessage) return this.options.handleMessage(this.socket, context).pipe(takeUntil(this.destroy$));

        return fromEvent(this.socket as IEventEmitter, this.options.messageEvent ?? ev.DATA, this.options.messageEventHandle ? this.options.messageEventHandle : (chunk) => {
            if (isBuffer(chunk) || this.streamAdapter.isReadable(chunk)) return chunk;
            return Buffer.from(chunk);
        }).pipe(takeUntil(this.destroy$));
    }

}


@Injectable()
export class DefaultClientTransportSessionFactory implements ClientTransportSessionFactory<any> {

    constructor() { }

    create(injector: Injector, socket: IDuplexStream, options: TransportOpts): DefaultClientTransportSession {
        return new DefaultClientTransportSession(injector, socket,
            injector.get(options.encodingsFactory ?? EncodingsFactory).create(injector, options),
            injector.get(options.decodingsFactory ?? DecodingsFactory).create(injector, options),
            injector.get(StreamAdapter),
            options);
    }

}