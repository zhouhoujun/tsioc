import { MessageFactory, UrlMesage } from '@tsdi/common';
import { IReadableStream } from '@tsdi/common/transport';

export class HttpMesage extends UrlMesage {

}


export class HttpMesageFactory implements MessageFactory {

    create(initOpts: {
        id?: string | number;
        url?: string;
        pattern?: string;
        headers?: Record<string, any>;
        /**
         * params.
         */
        params?: Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

        data?: string | Buffer | IReadableStream | null;

    }): HttpMesage {
        return new HttpMesage(initOpts.url ?? initOpts.pattern!, initOpts);
    }

}