import { Abstract } from '@tsdi/ioc';
import { Filter } from '../filter';
import { ExecptionContext } from './context';

/**
 * execption filter.
 */
@Abstract()
export abstract class ExecptionFilter extends Filter {
    /**
     * handle execption.
     * @param ctx invocation context with execption error.
     * @param next invoke next filter in chain.
     */
    abstract handle(ctx: ExecptionContext, next: () => Promise<void>): Promise<any>;
}

