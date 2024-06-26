import { Injectable, isString } from '@tsdi/ioc';
import { MessageFactory, Pattern, PatternFormatter, PatternMesage } from '@tsdi/common';
import { AbstractTransportSession, IReadableStream, MessageReader, MessageWriter, StreamAdapter, ev } from '@tsdi/common/transport';
import Redis from 'ioredis';
import { Observable, filter, fromEvent, merge } from 'rxjs';

export interface ReidsSocket {
    publisher: Redis;
    subscriber: Redis;
}

export class RedisMessage extends PatternMesage {
    readonly topic: string;
    constructor(init: {
        id?: string | number;
        topic?: string;
        pattern?: Pattern;
        headers?: Record<string, any>;
        data?: string | Buffer | IReadableStream | null;
        streamLength?: number;
    }, private patternFormatter: PatternFormatter) {
        super(init);
        this.topic = init.topic ?? patternFormatter.format(init.pattern!)
    }
}

@Injectable()
export class RedisMessageFactory implements MessageFactory {

    constructor(private patternFormater: PatternFormatter) { }

    create(initOpts: {
        id?: string | number;
        pattern: Pattern;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: string | Buffer | IReadableStream | null;

    }): RedisMessage {
        return new RedisMessage(initOpts, this.patternFormater);
    }

}


const PATTERN_MSG_BUFFER = 'pmessageBuffer';

@Injectable()
export class RedisMessageReader implements MessageReader<ReidsSocket> {

    read(socket: ReidsSocket, messageFactory: RedisMessageFactory, session?: AbstractTransportSession): Observable<RedisMessage> {
        return merge(
            fromEvent(socket.subscriber, ev.MESSAGE_BUFFER, (topic: string | Buffer, data: string | Buffer) => {
                return messageFactory.create({ pattern: isString(topic) ? topic : new TextDecoder().decode(topic), data })
            }),
            fromEvent(socket.subscriber, PATTERN_MSG_BUFFER, (pattern: string, topic: string | Buffer, data: string | Buffer) => {
                return messageFactory.create({ pattern: isString(topic) ? topic : new TextDecoder().decode(topic), data })
            })
        ).pipe(
            filter(msg => !session?.options.client ? !msg.topic.endsWith('.reply') : true),
        )
        // return fromEvent(socket, ev.MESSAGE, (msg: Buffer, rinfo: RemoteInfo) => {
        //     const addr = socket.address();
        //     if(rinfo.address == addr.address && rinfo.port == addr.port) return null!;
        //     return messageFactory.create({ data: msg, remoteInfo: rinfo });
        // }).pipe(
        //     filter(r => r !== null)
        // );
    }
}

@Injectable()
export class RedisMessageWriter implements MessageWriter<ReidsSocket, RedisMessage> {

    write(socket: ReidsSocket, msg: RedisMessage): Promise<any> {
        return promisify<Buffer, number, string>(socket.send, socket)(msg.data as Buffer, msg.remoteInfo.port, msg.remoteInfo.address)
    }

    async writeStream(socket: Socket, msg: RedisMessage, streamAdapter: StreamAdapter): Promise<any> {
        const bufs = await toBuffer(msg.data as IReadableStream);
        return await promisify<Buffer, number, string>(socket.send, socket)(bufs, msg.remoteInfo.port, msg.remoteInfo.address)
    }

}
