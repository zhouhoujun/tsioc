import { IActivity, InjectAcitityToken, DependenceConfigure } from '../core';
import { Registration, Type } from '@ts-ioc/core';
import { Task } from '../decorators/Task';
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
@Task(DependenceActivityToken, 'dependence')
export class DependenceActivity extends ControlActivity {

    /**
     * execute body.
     *
     * @protected
     * @memberof DependenceActivity
     */
    protected async execute() {
        let config = this.context.config as DependenceConfigure;
        await this.execActivity(config.dependence, this.context);
    }
}
