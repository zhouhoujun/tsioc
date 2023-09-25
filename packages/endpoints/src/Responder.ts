import { Abstract } from '@tsdi/ioc';
import { MessageExecption } from '@tsdi/common';
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
    /**
     * send execption message.
     * @param ctx 
     * @param err execption message
     */
    abstract sendExecption(ctx: T, err: MessageExecption): Promise<any>;
}
