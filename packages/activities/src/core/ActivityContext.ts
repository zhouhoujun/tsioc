import { DefaultInvocationContext, Injector } from '@tsdi/ioc';
import { ActivityExecutor } from './ActivityExecutor';
import { Expression } from './ActivityMetadata';



/**
 * activity execute context.
 *
 * @export
 * @class ActivityContext
 */
export class ActivityContext extends DefaultInvocationContext {

    getExector(): ActivityExecutor {
        return this.resolve(ActivityExecutor);
    }

    resolveExpression<TVal>(express: Expression<TVal>, injector?: Injector): Promise<TVal> {
        return this.getExector().resolveExpression(express, injector);
    }

}
