import { Injectable } from '@tsdi/ioc';
import { MessageFactory, UrlMesage } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';


export class TcpMessage extends UrlMesage {

}

@Injectable()
export class TcpMessageFactory implements MessageFactory {

    create(initOpts: {
        id?: string | number;
        url?: string;
        pattern?: string;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }): TcpMessage {
        return new TcpMessage(initOpts.url ?? initOpts.pattern!, initOpts);
    }

}