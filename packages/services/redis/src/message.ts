import { Injectable } from '@tsdi/ioc';
import { MessageFactory, Pattern, PatternMesage } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';


export class RedisMessage extends PatternMesage {

}

@Injectable()
export class RedisMessageFactory implements MessageFactory {


    create(initOpts: {
        id?: string | number;
        pattern: Pattern;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: Buffer | IReadableStream | null;

    }): RedisMessage {
        return new RedisMessage(initOpts);
    }

}