import { Abstract, Destoryable } from '@tsdi/ioc';
import { IBootContext } from '../BootContext';

/**
 * startup db connections of application.
 */
@Abstract()
export abstract class ConnectionStatupService<T extends IBootContext = IBootContext> extends Destoryable {

    constructor() {
        super();
    }

    /**
     *  startup db connection
     *
     * @abstract
     * @param {T} [ctx]
     * @memberof ConfigureRegister
     */
    abstract configureService(ctx: T): Promise<void>;

    /**
     * default do nothing.
     */
    protected destroying() {

    }
}
