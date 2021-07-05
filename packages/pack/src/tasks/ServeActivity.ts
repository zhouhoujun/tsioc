import { Input, Attribute } from '@tsdi/components';
import { Task, Src, TemplateOption } from '@tsdi/activities';
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
    dirs: Binding<Src>;
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
     * @type {number}
     * @memberof ServeActivity
     */
    @Input()
    port: number;

    /**
     * dirs.
     *
     * @type {Src}
     * @memberof ServeActivity
     */
    @Input()
    dirs: Src;

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
