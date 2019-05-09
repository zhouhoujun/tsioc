import { Task, Src, ActivityConfigure, Activity, Expression } from '@tsdi/activities';
import { Input } from '@tsdi/boot';


/**
 * ServeConfigure
 *
 * @export
 * @interface ServeConfigure
 */
export interface ServeConfigure extends ActivityConfigure {
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
    dirs: Expression<Src>;
}

/**
 * Serve activity.
 *
 * @export
 * @class ServeActivity
 * @extends {BuildActivity}
 */
@Task('serve')
export class ServeActivity extends Activity<void> {

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
    protected async execute(): Promise<void> {

    }
}
