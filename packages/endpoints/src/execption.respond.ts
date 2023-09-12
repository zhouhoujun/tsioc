import { Abstract } from '@tsdi/ioc';
import { MessageExecption } from '@tsdi/common';
import { TransportContext } from './TransportContext';
import { Encoder } from './Encoder';


@Abstract()
export abstract class ExecptionRespondAdapter<T extends TransportContext = TransportContext> {
    
    /**
     * encoder.
     */
    abstract get encoder(): Encoder;
    /**
     * error respond.
     */
    abstract respond(context: T, err: MessageExecption): any;
}
