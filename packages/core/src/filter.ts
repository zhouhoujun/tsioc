

import { Abstract, InvocationContext } from '@tsdi/ioc';

/**
 * execption filter.
 */
@Abstract()
export abstract class Filter {
    /**
     * handle execption.
     * @param ctx invocation context with execption error.
     * @param next invoke next filter in chain.
     */
    abstract handle(ctx: InvocationContext, next: () => Promise<void>): Promise<any>;
}

