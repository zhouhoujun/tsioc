import { Injectable } from '@tsdi/ioc';
import { MessageFactory, Pattern, PatternMesage } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';


export class TcpMessage extends PatternMesage {

}

@Injectable()
export class TcpMessageFactory implements MessageFactory {


    create(initOpts: {
        id?: string | number;
        pattern: Pattern;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }): TcpMessage {
        return new TcpMessage(initOpts);
    }

}