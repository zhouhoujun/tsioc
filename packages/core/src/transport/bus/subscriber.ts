import { Abstract } from '@tsdi/ioc';
import { Channel } from './channel';

@Abstract()
export abstract class Subscriber {
    /**
     * channel of publisher
     */
    abstract get channel(): Channel;
    /**
     * connect.
     */
    abstract connect(): Promise<void>;
    /**
     * close subscriber.
     */
    abstract close(): Promise<void>;

}
