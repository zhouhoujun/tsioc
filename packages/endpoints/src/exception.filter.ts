import { Injectable } from '@tsdi/ioc';
import { ExceptionFilter } from '@tsdi/core';
import { Logger } from '@tsdi/logger';
import { RequestContext } from '@tsdi/common';
import { Transport } from '@tsdi/common/transport';


@Injectable({ static: true })
export class ExceptionFinalizeFilter<TInput> extends ExceptionFilter<TInput, any> {

    catchError(req: TInput, err: any, context: RequestContext) {
        const logger = context.get(Logger) ?? console;
        logger.error(err);

        const transport = context.get(Transport);
        return transport.send(err, context)
    }

}
