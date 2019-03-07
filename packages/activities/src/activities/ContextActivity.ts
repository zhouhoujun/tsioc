import { IActivity, Activity, IActivityContext } from '../core';
import { Registration, Type, lang } from '@ts-ioc/ioc';
import { Task } from '../decorators/Task';



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
        await this.executeBefore();
        await this.execute();
        await this.executeAfter();
        return this.context;
    }


    /**
     * before run sequence.
     *
     * @protected
     * @param {*} [data]
     * @returns {Promise<void>}
     * @memberof ContextActivity
     */
    protected async executeBefore(): Promise<void> {
        let dep = this.container.getRefService(InjectBeforeActivity, lang.getClass(this));
        await this.execActivity(dep, this.context);
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
    protected async executeAfter(): Promise<void> {
        let dep = this.container.getRefService(InjectAfterActivity, lang.getClass(this));
        await this.execActivity(dep, this.context);
    }
}
