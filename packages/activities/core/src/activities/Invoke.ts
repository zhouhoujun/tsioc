import { Task } from '../decorators';
import { InjectAcitityToken, ActivityContext } from '../core';
import { Token, ObjectMap, lang } from '@ts-ioc/core';
import { ControlActivity } from './ControlActivity';

/**
 * while activity token.
 */
export const InvokeActivityToken = new InjectAcitityToken<InvokeActivity>('invoke');

/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Task(InvokeActivityToken, 'invoke')
export class InvokeActivity extends ControlActivity {
    /**
     * while condition.
     *
     * @type {Condition}
     * @memberof InvokeActivity
     */
    args: ObjectMap<any>;

    /**
     * target instance.
     *
     * @type {*}
     * @memberof InvokeActivity
     */
    target?: any;


    protected async execute(): Promise<any> {
        return this.execActivity(this.context.config.invoke, this.context);
    }
}
