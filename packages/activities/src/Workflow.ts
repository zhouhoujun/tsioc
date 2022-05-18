import { Type, Injectable } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption, RunnableFactory, Startup, UuidGenerator } from '@tsdi/core';
import { SequenceActivity } from './activities';
import { ActivityOption } from './core/ActivityOption';
import { ActivityType } from './core/ActivityMetadata';
import { ActivityRef } from './core/ActivityRef';

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

    startup(): void | Promise<void> {
        throw new Error('Method not implemented.');
    }


    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {Type} type
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    async sequence<T>(type: Type<T>): Promise<T>;
    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {...ActivityType<T>[]} activities
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    async sequence<T>(...activities: ActivityType<T>[]): Promise<ActivityRef<T>>;
    async sequence(...activities: any[]): Promise<ActivityRef> {
        const option = activities.length > 1 ? { template: activities, providers: [], module: SequenceActivity, staticSeq: true } as ActivityOption : activities[0];
        return await this.run(option);
    }

    /**
     * run activity.
     *
     * @template T
     * @param {(T | Type | ActivityOption<T>)} target
     * @param {(LoadType[] | LoadType | string)} [deps]  workflow run depdences.
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    async run<T>(target: Type<T> | ActivityOption<T> | RunnableFactory<T>, option?: BootstrapOption): Promise<ActivityRef<T>> {
        return this.context.bootstrap(target, option);
    }



    protected createUUID() {
        return this.context.get(UuidGenerator).generate();
    }
}


