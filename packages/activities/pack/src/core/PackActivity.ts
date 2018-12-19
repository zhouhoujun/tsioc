import { BuildActivity, CleanActivity, TestActivity } from '@taskfr/build';
import { Pack } from '../decorators';
import { IPackActivity, PackToken } from './IPackActivity';
import { ServeActivity } from '../serves';


@Pack(PackToken)
export class PackActivity extends BuildActivity implements IPackActivity {
    /**
     * clean activity.
     *
     * @type {CleanActivity}
     * @memberof PackActivity
     */
    clean: CleanActivity;

    /**
     * test activity.
     *
     * @type {TestActivity}
     * @memberof PackActivity
     */
    test: TestActivity;
    /**
     * serve activity.
     *
     * @type {ServeActivity}
     * @memberof IPackActivity
     */
    serve: ServeActivity;

    /**
     * execute once action.
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof PackActivity
     */
    protected async execOnce(): Promise<void> {
        await this.execActivity(this.clean, this.context);
        await super.execOnce();
    }

    protected async beforeBuild() {
        await this.execActivity(this.test, this.context);
        await this.execActivity(this.before, this.context);
    }

    protected async afterBuild() {
        await super.afterBuild();
        await this.execActivity(this.serve, this.context);
    }
}
