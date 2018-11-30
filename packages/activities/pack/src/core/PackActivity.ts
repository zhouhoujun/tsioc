import { BuildActivity, CleanActivity, TestActivity } from '@taskfr/build';
import { Pack } from '../decorators';
import { IPackActivity } from './IPackActivity';
import { ServeActivity } from '../serves';


@Pack
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
        if (this.clean) {
            await this.clean.run(this.context);
        }
        await super.execOnce();
    }

    protected async beforeBuild() {
        if (this.test) {
            await this.test.run(this.context);
        }
        if (this.before) {
            await this.before.run(this.context);
        }
        if (this.serve) {
            await this.serve.run(this.context);
        }
    }
}
