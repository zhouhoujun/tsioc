import { Abstract } from '@tsdi/ioc';
import { TransportContext } from '@tsdi/transport';
import { Encoder } from './Encoder';

/**
 * Respond adapter.
 */
@Abstract()
export abstract class RespondAdapter<T extends TransportContext> {
    /**
     * encoder.
     */
    abstract get encoder(): Encoder;
    /**
     * respond.
     * @param ctx 
     */
    abstract respond(ctx: T, res: any): Promise<any>;
}
