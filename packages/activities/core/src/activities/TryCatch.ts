import { Task } from '../decorators';
import { IActivity, InjectAcitityToken, Condition, TryCatchConfigure, IHandleActivity } from '../core';
import { ChainActivity } from './ChainActivity';

/**
 * while activity token.
 */
export const TryCatchActivityToken = new InjectAcitityToken<TryCatchActivity>('trycatch');

/**
 * while control activity.
 *
 * @export
 * @class TryCatchActivity
 * @extends {ControlActivity}
 */
@Task(TryCatchActivityToken, 'try')
export class TryCatchActivity extends ChainActivity {
    /**
     * while condition.
     *
     * @type {Condition}
     * @memberof TryCatchActivity
     */
    condition: Condition;
    /**
     * try activity.
     *
     * @type {IActivity}
     * @memberof TryCatchActivity
     */
    try: IActivity;
    /**
     * catch activities.
     *
     * @type {IHandleActivity[]}
     * @memberof TryCatchActivity
     */
    get catchs(): IHandleActivity[] {
        return this.handles;
    }

    /**
     * finally activity.
     *
     * @memberof TryCatchActivity
     */
    finally?: IActivity;

    async onActivityInit(config: TryCatchConfigure): Promise<void> {
        config.handles = config.catchs
        await super.onActivityInit(config);
        this.try = await this.buildActivity(config.try);
        if (config.finally) {
            this.finally = await this.buildActivity(config.finally);
        }
    }

    protected async execute(): Promise<void> {
        try {
            await this.execActivity(this.try, this.context);
        } catch (err) {
            await super.run(this.context);
        } finally {
            await this.execActivity(this.finally, this.context);
        }
    }
}
