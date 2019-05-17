import { BootApplication, ContextInit, checkBootArgs } from '@tsdi/boot';
import {
    UUIDToken, RandomUUIDFactory, WorkflowInstance, ActivityContext,
    ActivityType, ActivityOption
} from './core';
import { Type, isClass, LoadType, isArray } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { ActivityCoreModule } from './CoreModule';
import { SequenceActivity } from './activities';

/**
 * workflow builder.
 *
 * @export
 * @class Workflow
 * @extends {BootApplication}
 */
export class Workflow extends BootApplication implements ContextInit {

    protected onInit(target: Type<any> | ActivityOption<ActivityContext> | ActivityContext) {
        if (!isClass(target)) {
            if (!target.module && isArray(target.template)) {
                target.module = SequenceActivity;
            }
        }
        super.onInit(target);
    }


    getWorkflow(workflowId: string): WorkflowInstance {
        return this.getPools().getRoot().get(workflowId);
    }

    getContext(): ActivityContext {
        return super.getContext() as ActivityContext;
    }

    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {...ActivityType<T>[]} activities
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async sequence<T extends ActivityContext>(...activities: ActivityType[]): Promise<T> {
        let option = { template: activities, module: SequenceActivity } as ActivityOption<T>;
        let runner = await Workflow.run(option) as T;
        return runner;
    }

    /**
     * run activity.
     *
     * @static
     * @template T
     * @param {(T | Type<any> | ActivityOption<T>)} target
     * @param {(LoadType[] | LoadType | string)} [deps]  workflow run depdences.
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async run<T extends ActivityContext>(target: T | Type<any> | ActivityOption<T>, deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<T> {
        let mdargs = checkBootArgs(deps, ...args);
        return await new Workflow(target, mdargs.deps).run(...mdargs.args) as T;
    }

    onContextInit(ctx: ActivityContext) {
        super.onContextInit(ctx);
        ctx.id = ctx.id || this.createUUID();
    }

    getBootDeps() {
        return [AopModule, LogModule, ActivityCoreModule, ...super.getBootDeps()];
    }

    protected createUUID() {
        let container = this.getPools().getRoot();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
