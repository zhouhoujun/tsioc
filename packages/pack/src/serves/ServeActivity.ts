import { Task, Src, CtxType, ActivityConfigure } from '@ts-ioc/activities';
import { NodeActivity } from '@ts-ioc/build';


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
    dirs: CtxType<Src>;
}

/**
 * Serve activity.
 *
 * @export
 * @class ServeActivity
 * @extends {BuildActivity}
 */
@Task('serve')
export class ServeActivity extends NodeActivity {

    /**
     * serve port.
     *
     * @type {number}
     * @memberof ServeActivity
     */
    port: number;

    /**
     * dirs.
     *
     * @type {Src}
     * @memberof ServeActivity
     */
    dirs: Src;

    constructor() {
        super();
    }

    async onActivityInit(config: ServeConfigure): Promise<void> {
        await super.onActivityInit(config);
        this.dirs = await this.context.to(config.dirs);
        this.port = await this.context.to(config.port);
    }

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
