import { Injectable } from '@tsdi/ioc';
import { Message, MessageFactory } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';


export class TcpMessage implements Message<Buffer | IReadableStream> {
    readonly headers = null;
    constructor(
        public id: string | number | null,
        readonly data: Buffer | IReadableStream) {
    }
}

@Injectable()
export class TcpMessageFactory implements MessageFactory {

    create(data: Buffer | IReadableStream, options?: { id?: string | number | null; headers?: Record<string, any> | null; } | undefined): TcpMessage {
        return new TcpMessage(options?.id ?? null, data)
    }

}