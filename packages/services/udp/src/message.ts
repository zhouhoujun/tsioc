import { Injectable } from '@tsdi/ioc';
import { MessageFactory, Pattern, PatternMesage } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';


export class UdpMessage extends PatternMesage {

}

@Injectable()
export class UdpMessageFactory implements MessageFactory {


    create(initOpts: {
        id?: string | number;
        pattern: Pattern;
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