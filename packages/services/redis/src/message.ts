import { Injectable, isString, promisify } from '@tsdi/ioc';
import { MessageFactory, TopicMesage } from '@tsdi/common';
import { AbstractTransportSession, IReadableStream, MessageReader, MessageWriter, StreamAdapter, ev, toBuffer } from '@tsdi/common/transport';
import Redis from 'ioredis';
import { Observable, filter, fromEvent, merge } from 'rxjs';

export interface ReidsSocket {
    publisher: Redis;
    subscriber: Redis;
}

export class RedisMessage extends TopicMesage {

}

@Injectable()
export class RedisMessageFactory implements MessageFactory {

    constructor() { }

    create(initOpts: {
        id?: string | number;
        topic?: string;
        pattern?: string;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: string | Buffer | IReadableStream | null;

    }): RedisMessage {
        return new RedisMessage(initOpts.topic ?? initOpts.pattern!, initOpts);
    }

}


const PATTERN_MSG_BUFFER = 'pmessageBuffer';

@Injectable()
export class RedisMessageReader implements MessageReader<ReidsSocket, any, RedisMessage> {

    read(socket: ReidsSocket, channel: any, messageFactory: RedisMessageFactory, session?: AbstractTransportSession): Observable<RedisMessage> {
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
    }
}

@Injectable()
export class RedisMessageWriter implements MessageWriter<ReidsSocket, RedisMessage> {

    async write(socket: ReidsSocket, msg: RedisMessage, origin: any, session: AbstractTransportSession): Promise<any> {
        if (!msg.data) return;
        if (session.streamAdapter.isReadable(msg.data)) {
            const data = await toBuffer(msg.data);
            await socket.publisher.publish(msg.topic, data);
        } else {
            await socket.publisher.publish(msg.topic, msg.data);
        }
    }

}
