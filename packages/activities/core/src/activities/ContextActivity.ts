import { IActivity, Activity, IActivityContext } from '../core';
import { Registration, Type } from '@ts-ioc/core';
import { Task } from '../decorators';



/**
 * before dependence activity inject token.
 *
 * @export
 * @class InjectBeforeActivity
 * @extends {Registration<T>}
 * @template T
 */
export class InjectBeforeActivity<T extends IActivity> extends Registration<T> {
    constructor(type: Type<T>) {
        super(type, 'BeforeDepActivity');
    }
}

/**
 * after dependence activity inject token.
 *
 * @export
 * @class InjectBeforeActivity
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAfterActivity<T extends IActivity> extends Registration<T> {
    constructor(type: Type<T>) {
        super(type, 'AfterDepActivity');
    }
}


/**
 * activity with before after context.
 *
 * @export
 * @abstract
 * @class ContextActivity
 * @extends {Activity}
 */
@Task
export abstract class ContextActivity extends Activity {

    /**
    * run task.
    *
    * @param {IActivityContext} [ctx] execute context.
    * @returns {Promise<T>}
    * @memberof Activity
    */
    async run(ctx?: IActivityContext): Promise<IActivityContext> {
        this.verifyCtx(ctx);
        await this.before();
        await this.execute();
        await this.after();
        return this.getContext();
    }


    /**
     * before run sequence.
     *
     * @protected
     * @param {*} [data]
     * @returns {Promise<void>}
     * @memberof ContextActivity
     */
    protected async before(): Promise<void> {
        if (this.config && this.config.type) {
            let dep = this.getContext().getContainer().getRefService(InjectBeforeActivity, this.config.type);
            if (dep) {
                await dep.run(this.getContext());
            }
        }
    }

    /**
     * execute the activity body.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof Activity
     */
    protected abstract async execute(): Promise<void>;

    /**
     * after run sequence.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ContextActivity
     */
    protected async after(): Promise<void> {
        if (this.config && this.config.type) {
            let dep = this.getContext().getContainer().getRefService(InjectAfterActivity, this.config.type);
            if (dep) {
                await dep.run(this.getContext());
            }
        }
    }
}
