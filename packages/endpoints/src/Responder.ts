import { Abstract } from '@tsdi/ioc';
import { Sender } from '@tsdi/common/client';
import { TransportContext } from './TransportContext';
import { MessageExecption } from '@tsdi/common';





/**
 * Respond adapter.
 */
@Abstract()
export abstract class Responder<T extends TransportContext = TransportContext> {

    /**
     * packet sender
     */
    abstract get sender(): Sender;

    /**
     * send response message.
     * @param ctx 
     * @param res response
     */
    abstract send(ctx: T, res: any): Promise<any>;
    /**
     * send execption message.
     * @param context 
     * @param err execption message
     */
    abstract sendExecption(context: T, err: MessageExecption): Promise<any>;
}
