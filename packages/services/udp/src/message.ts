import { Injectable } from '@tsdi/ioc';
import { MessageFactory, Pattern, PatternMesage } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';
import { RemoteInfo } from 'dgram';

export class UdpMessage extends PatternMesage {
    readonly remoteInfo: RemoteInfo;
    constructor(
        init: {
            id?: string | number;
            remoteInfo: RemoteInfo,
            pattern: Pattern;
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