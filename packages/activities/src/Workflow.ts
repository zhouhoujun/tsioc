import { Type, Injectable, lang } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption, getModuleType, RunnableFactory, Startup, UuidGenerator } from '@tsdi/core';
import { ActivityRef } from './refs/compoent';
import { ActivityOption } from './refs/activity';

/**
 * workflow builder.
 *
 * @export
 * @class Workflow
 * @extends {Application}
 */
@Injectable()
export class Workflow implements Startup {

    constructor(private context: ApplicationContext) { }

    async startup(): Promise<void> {
        const option = this.context.get(ActivityOption);
        const injector = this.context.injector;
        if (option.imports) {
            getModuleType(option.imports).forEach(imp => injector.import(imp));
        }
        if (option.declarations) injector.load(option.declarations);
        if (option.bootstrap) {
            const boots = lang.getTypes(option.bootstrap);
            await Promise.all(boots.map(b => this.run(b)));
        }
    }


    // /**
    //  * run sequence.
    //  *
    //  * @static
    //  * @template T
    //  * @param {Type} type
    //  * @returns {Promise<T>}
    //  * @memberof Workflow
    //  */
    // async sequence<T>(type: Type<T>): Promise<T>;
    // /**
    //  * run sequence.
    //  *
    //  * @static
    //  * @template T
    //  * @param {...ActivityType<T>[]} activities
    //  * @returns {Promise<T>}
    //  * @memberof Workflow
    //  */
    // async sequence<T>(...activities: TypeOf<T>[]): Promise<ActivityRef<T>>;
    // async sequence(...activities: any[]): Promise<ActivityRef> {
    //     const option = activities.length > 1 ? { template: activities, providers: [], module: SequenceActivity, staticSeq: true } : activities[0];
    //     return await this.run(option);
    // }

    /**
     * run activity.
     *
     * @template T
     * @param {(Type<T> | RunnableFactory<T> )} target
     * @param option bootstrap option, instance of {@link BootstrapOption}
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    async run<T>(target: Type<T> | RunnableFactory<T>, option?: BootstrapOption): Promise<ActivityRef<T>> {
        return this.context.bootstrap(target, option);
    }



    protected createUUID() {
        return this.context.get(UuidGenerator).generate();
    }
}


