import { ModuleDef, Type, isFunction } from '@tsdi/ioc';
import { Application, ApplicationContext, EnvironmentOption } from '@tsdi/core';
import { ActivityOption } from './options';
import { ActivityModule } from './ActivityModule';



/**
 * workflow.
 *
 * @export
 * @class Workflow
 */
export class Workflow {

    /**
     * run activity with dynamic module.
     *
     * @template T
     * @param {(Type<T> | ActivityOption )} target activity or  activity option.
     * @param option bootstrap option, instance of {@link EnvironmentOption}
     * @returns {Promise<ApplicationContext>}
     */
    static run<T>(target: Type<T> | ActivityOption, option?: EnvironmentOption): Promise<ApplicationContext> {
        return runActivity(target, option);
    }

}

/**
 * run activity with dynamic module.
 *
 * @template T
 * @param {(Type<T> | ActivityOption )} target activity or  activity option.
 * @param option bootstrap option, instance of {@link EnvironmentOption}
 * @returns {Promise<ApplicationContext>}
 */
export function runActivity<T>(target: Type<T> | ActivityOption, option?: EnvironmentOption): Promise<ApplicationContext> {
    const op = isFunction(target) ? { declarations: [target], bootstrap: target } : target;
    return Application.run({
        ...option,
        module: {
            ...op,
            imports: [ActivityModule, ...op.imports ?? []]
        } as ModuleDef<T>
    });
}