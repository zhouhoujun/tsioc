import { MessageFactory, Pattern, PatternMesage } from '@tsdi/common';
import { AbstractTransportSession, IReadableStream, MessageReader, MessageWriter, StreamAdapter, ev, toBuffer } from '@tsdi/common/transport';
import { Injectable, promisify } from '@tsdi/ioc';
import { RemoteInfo, Socket } from 'dgram';
import { Observable, filter, fromEvent } from 'rxjs';

export class UdpMessage extends PatternMesage {
    readonly remoteInfo: RemoteInfo;
    constructor(
        init: {
            id?: string | number;
            remoteInfo: RemoteInfo,
            pattern?: Pattern;
            headers?: Record<string, any>;
            data?: Buffer | IReadableStream | null;
            streamLength?: number;
        }
    ) {
        super(init);
        this.remoteInfo = init.remoteInfo;
    }
}

@Injectable()
export class UdpMessageFactory implements MessageFactory {

    create(initOpts: {
        id?: string | number;
        remoteInfo: RemoteInfo,
        pattern?: Pattern;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }): UdpMessage {
        return new UdpMessage(initOpts);
    }

}

@Injectable()
export class UdpMessageReader implements MessageReader<Socket> {

    read(socket: Socket, messageFactory: UdpMessageFactory, session?: AbstractTransportSession): Observable<UdpMessage> {
        return fromEvent(socket, ev.MESSAGE, (msg: Buffer, rinfo: RemoteInfo) => {
            const addr = socket.address();
            if(rinfo.address == addr.address && rinfo.port == addr.port) return null!;
            return messageFactory.create({ data: msg, remoteInfo: rinfo });
        }).pipe(
            filter(r => r !== null)
        );
    }
}

@Injectable()
export class UdpMessageWriter implements MessageWriter<Socket, UdpMessage> {

    write(socket: Socket, msg: UdpMessage): Promise<any> {
        return promisify<Buffer, number, string>(socket.send, socket)(msg.data as Buffer, msg.remoteInfo.port, msg.remoteInfo.address)
    }

    async writeStream(socket: Socket, msg: UdpMessage, streamAdapter: StreamAdapter): Promise<any> {
        const bufs = await toBuffer(msg.data as IReadableStream);
        return await promisify<Buffer, number, string>(socket.send, socket)(bufs, msg.remoteInfo.port, msg.remoteInfo.address)
    }

}
