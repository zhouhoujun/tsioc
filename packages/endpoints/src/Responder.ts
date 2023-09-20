import { Abstract } from '@tsdi/ioc';
import { Sender, MessageExecption } from '@tsdi/common';
import { TransportContext } from './TransportContext';





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
