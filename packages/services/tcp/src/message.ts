import { Injectable } from '@tsdi/ioc';
import { Message, MessageFactory } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';


export class TcpMessage extends Message {

}

@Injectable()
export class TcpMessageFactory implements MessageFactory {

    create(data: Buffer | IReadableStream, options?: { id?: string | number; headers?: Record<string, any>; }): TcpMessage {
        return new TcpMessage(data, options)
    }

}