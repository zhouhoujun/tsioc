import { Task } from '../decorators';
import { InjectAcitityToken, ActivityContext } from '../core';
import { Token, ObjectMap } from '@ts-ioc/core';
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
@Task(InvokeActivityToken)
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
    /**
     * invoke target token.
     *
     * @type {Token<any>}
     * @memberof InvokeActivity
     */
    targetType: Token<any>;

    protected async execute(): Promise<any> {
        let ctx = this.getContext();
        return ctx.getContainer().invoke(this.targetType, this.target, this.args, { provide: ActivityContext, useValue: ctx });
    }
}
