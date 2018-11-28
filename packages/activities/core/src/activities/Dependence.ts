import { IActivity, InjectAcitityToken, DependenceConfigure, Activity } from '../core';
import { Registration, Type } from '@ts-ioc/core';
import { Task } from '../decorators';
import { ControlActivity } from './ControlActivity';

/**
 * dependence activity inject token.
 *
 * @export
 * @class InjectDependenceActivity
 * @extends {Registration<T>}
 * @template T
 */
export class InjectDependenceActivity<T extends IActivity> extends Registration<T> {
    constructor(type: Type<T>) {
        super(type, 'DependenceActivity');
    }
}


/**
 * Dependence activity token.
 */
export const DependenceActivityToken = new InjectAcitityToken<DependenceActivity>('dependence');

/**
 * dependence activity.
 *
 * @export
 * @class DependenceActivity
 * @extends {ControlActivity}
 */
@Task(DependenceActivityToken)
export class DependenceActivity extends ControlActivity {

    /**
     * custom dependence
     *
     * @type {IActivity}
     * @memberof DependenceActivity
     */
    dependence: IActivity;

    /**
     * body
     *
     * @type {IActivity}
     * @memberof DependenceActivity
     */
    body: IActivity;

    async onActivityInit(config: DependenceConfigure): Promise<any> {
        await super.onActivityInit(config);
        this.dependence = await this.buildActivity(config.dependence);
        this.body = await this.buildActivity(config.body);
    }


    /**
     * execute body.
     *
     * @protected
     * @memberof DependenceActivity
     */
    protected async execute() {
        if (this.dependence) {
            await this.dependence.run(this.context);
        }
        await this.body.run(this.context);
    }

}
