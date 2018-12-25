import { BuildHandleContext, HandleContextToken } from './BuildHandleActivity';
import { Task, ActivityContextToken } from '@taskfr/core';
import { NodeActivity } from './NodeActivity';
import { Providers } from '@ts-ioc/core';


/**
 * compiler activity.
 *
 * @export
 * @abstract
 * @class CompilerActivity
 * @extends {NodeActivity}
 */
@Task
@Providers([
    { provide: ActivityContextToken, useExisting: HandleContextToken }
])
export abstract class CompilerActivity extends NodeActivity {

    /**
     * compile context.
     *
     * @type {BuildHandleContext<any>}
     * @memberof CompilerActivity
     */
    context: BuildHandleContext<any>;

    protected isValidContext(ctx: any): boolean {
        return ctx instanceof BuildHandleContext;
    }

    /**
     * execute build activity.
     *
     * @protected
     * @abstract
     * @returns {Promise<void>}
     * @memberof NodeActivity
     */
    protected abstract execute(): Promise<void>;
}

@Task
export class EmptyCompiler extends CompilerActivity {
    protected async execute(): Promise<void> {

    }
}
