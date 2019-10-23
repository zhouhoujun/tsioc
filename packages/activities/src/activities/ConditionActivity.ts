import { Input } from '@tsdi/components';
import { Expression } from '../core';
import { Task } from '../decorators';
import { ExpressionActivity } from './ExpressionActivity';


/**
 * condition activity.
 *
 * @export
 * @class ConditionActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('[condition]')
export class ConditionActivity extends ExpressionActivity<boolean> {
    @Input('condition') expression: Expression<boolean>;
}
