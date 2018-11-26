import { BuildActivity, CleanActivity, TestActivity } from '@taskfr/build';
import { Pack } from '../decorators';
import { IPackActivity } from './IPackActivity';
import { ServeActivity } from '../serves';


@Pack({
    clean: 'dist',
    src: 'src',
    dist: 'dist',
    handles: [
        {
            test: '*.ts',
            compiler: 'tsc'
        }
    ]
})
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
            await this.clean.run(this.getContext());
        }
        await super.execOnce();
    }

    protected async execBeforeBody() {
        let ctx = this.getContext();
        if (this.test) {
            await this.test.run(ctx);
        }
        if (this.beforeBuildBody) {
            await this.beforeBuildBody.run(ctx);
        }
        if (this.serve) {
            await this.serve.run(ctx);
        }
    }
}
