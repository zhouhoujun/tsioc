import { Abstract } from '@tsdi/ioc';
import { StatusCode } from '@tsdi/common';
import { TransportContext } from './TransportContext';





/**
 * Respond adapter.
 */
@Abstract()
export abstract class Responder<T extends TransportContext = TransportContext> {

    /**
     * send response message.
     * @param ctx 
     * @param res response
     */
    abstract send(ctx: T, res: any): Promise<any>;
}


@Abstract()
export abstract class StatusMessageFormatter {
    /**
     * format status message.
     * @param ctx 
     */
    abstract format(ctx: TransportContext, statusCode: StatusCode): string;
}