import { Abstract } from '@tsdi/ioc';
import { OnDispose } from '../../lifecycle';
import { Runner } from '../../metadata/decor';
import { Channel } from './channel';


@Abstract()
@Runner('start')
export abstract class Publisher implements OnDispose {

    /**
     * channel of publisher
     */
    abstract get channel(): Channel;
    /**
     * start server
     */
    abstract start(): Promise<void>;
    /**
     * close server
     */
    abstract close(): Promise<void>;


    onDispose(): Promise<void> {
        return this.close()
    }

}
