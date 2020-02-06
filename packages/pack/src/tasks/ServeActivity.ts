import { Input, Binding } from '@tsdi/components';
import { Task, Src, Expression, TemplateOption } from '@tsdi/activities';
import { NodeExpression } from '../NodeActivityContext';
import { NodeActivity } from '../NodeActivity';


/**
 * ServeConfigure
 *
 * @export
 * @interface ServeConfigure
 */
export interface ServeConfigure extends TemplateOption {
    /**
     * serve port.
     *
     * @type {number}
     * @memberof ServeConfigure
     */
    port?: number;
    /**
     * dirs.
     *
     * @type {CtxType<Src>}
     * @memberof ServeConfigure
     */
    dirs: Binding<NodeExpression<Src>>;
}

/**
 * Serve activity.
 *
 * @export
 * @class ServeActivity
 * @extends {BuildActivity}
 */
@Task('serve')
export class ServeActivity extends NodeActivity<void> {

    /**
     * serve port.
     *
     * @type {Expression<number>}
     * @memberof ServeActivity
     */
    @Input()
    port: Expression<number>;

    /**
     * dirs.
     *
     * @type {Expression<Src>}
     * @memberof ServeActivity
     */
    @Input()
    dirs: Expression<Src>;

    /**
     * before run sequence.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof ServeActivity
     */
    async execute(): Promise<void> {

    }
}
