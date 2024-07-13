import { MessageFactory, Pattern, UrlMesage } from '@tsdi/common';
import { AbstractTransportSession, IEventEmitter, IReadableStream, MessageReader, MessageWriter, ev, toBuffer } from '@tsdi/common/transport';
import { Execption, Injectable, promisify } from '@tsdi/ioc';
import { RemoteInfo, Socket } from 'dgram';
import { Observable, filter, fromEvent } from 'rxjs';

export class UdpMessage extends UrlMesage {
    readonly remoteInfo: RemoteInfo;
    constructor(url: string,
        init: {
            id?: string | number;
            remoteInfo: RemoteInfo,
            headers?: Record<string, any>;
            data?: Buffer | IReadableStream | null;
            streamLength?: number;
        }
    ) {
        super(url, init);
        this.remoteInfo = init.remoteInfo;
    }
}

@Injectable()
export class UdpMessageFactory implements MessageFactory {

    create(initOpts: {
        id?: string | number;
        remoteInfo: RemoteInfo,
        url?: string;
        pattern?: string;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }): UdpMessage {
        return new UdpMessage(initOpts.url ?? initOpts.pattern!, initOpts);
    }

}

@Injectable()
export class UdpMessageReader implements MessageReader<Socket> {

    read(socket: Socket, channel: IEventEmitter | null | undefined, session: AbstractTransportSession): Observable<UdpMessage> {
        return fromEvent(socket, ev.MESSAGE, (msg: Buffer, rinfo: RemoteInfo) => {
            const addr = socket.address();
            if (rinfo.address == addr.address && rinfo.port == addr.port) return null!;
            return (session.messageFactory as UdpMessageFactory).create({ data: msg, remoteInfo: rinfo });
        }).pipe(
            filter(r => r !== null)
        );
    }
}

@Injectable()
export class UdpMessageWriter implements MessageWriter<Socket, UdpMessage> {

    async write(socket: Socket, msg: UdpMessage, origin: any, session: AbstractTransportSession): Promise<any> {
        let data = msg.data;
        if (session.streamAdapter.isReadable(data)) {
            data = await toBuffer(data);
        }
        if (!data) throw new Execption('message data is empty');
        return promisify<Buffer | string, number, string>(socket.send, socket)(data, msg.remoteInfo.port, msg.remoteInfo.address)
    }

}
