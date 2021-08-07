import { Input } from '@tsdi/components';
import { Expression } from '../core/ActivityMetadata';
import { Task } from '../metadata/decor';
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
