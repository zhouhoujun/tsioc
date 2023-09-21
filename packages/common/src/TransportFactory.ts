import { Abstract, InvocationContext } from '@tsdi/ioc';
import { Receiver } from './Receiver';
import { Sender } from './Sender';
import { Decoder, Encoder } from './coding';



/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * server side or not.
     */
    serverSide?: boolean;
    /**
     * packet delimiter flag
     */
    delimiter?: string;
    /**
     * packet size limit.
     */
    limit?: number;
    /**
     * payload max size limit.
     */
    maxSize?: number;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;
}


@Abstract()
export abstract class TransportFactory {
    /**
     * create receiver.
     * @param context 
     * @param decoder 
     * @param options 
     */
    abstract createReceiver(context: InvocationContext, decoder: Decoder, options: TransportOpts): Receiver;
    /**
     * create sender.
     * @param context 
     * @param encoder 
     * @param options 
     */
    abstract createSender(context: InvocationContext, encoder: Encoder, options: TransportOpts): Sender;
}
