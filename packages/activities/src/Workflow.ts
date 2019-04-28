import { BootApplication } from '@tsdi/boot';
import {
    UUIDToken, RandomUUIDFactory, WorkflowInstance, ActivityContext,
    ActivityType, ActivityOption
} from './core';
import { Type, isClass } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { CoreModule } from './CoreModule';
import { SequenceActivity } from './activities';

/**
 * workflow builder.
 *
 * @export
 * @class Workflow
 * @extends {BootApplication}
 */
export class Workflow extends BootApplication {

    protected onInit(target: Type<any> | ActivityOption<ActivityContext> | ActivityContext) {
        super.onInit(target);
        if (!isClass(target)) {
            if (!target.module && target.template) {
                target.module = SequenceActivity;
            }
        }
        this.container
            .use(AopModule)
            .use(LogModule)
            .use(CoreModule);
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
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async run<T extends ActivityContext>(target: T | Type<any> | ActivityOption<T>, ...args: string[]): Promise<T> {
        return await new Workflow(target).run(...args) as T;
    }

    protected initContext(ctx: ActivityContext, args: string[]) {
        super.initContext(ctx, args);
        ctx.id = ctx.id || this.createUUID();
    }

    protected createUUID() {
        let container = this.getPools().getRoot();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
