import { BootOption, BootApplication } from '@tsdi/boot';
import {
    UUIDToken, RandomUUIDFactory, WorkflowInstance, ActivityContext,
    ActivityType, SequenceOption, ControlType
} from './core';
import { Type } from '@tsdi/ioc';
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

    context: ActivityContext;
    protected onInit(target: Type<any> | BootOption | ActivityContext) {
        super.onInit(target);
        this.use(AopModule)
            .use(LogModule)
            .use(CoreModule);
    }


    getWorkflow<T extends ActivityContext>(workflowId: string): WorkflowInstance<T> {
        return this.getPools().getRoot().get(workflowId);
    }

    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {(T | ActivityType<T>)} [ctx]
     * @param {...ActivityType<T>[]} activities
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async sequence<T extends ActivityContext>(ctx?: T | ActivityType<T>, ...activities: ActivityType<T>[]): Promise<T> {
        if (ctx instanceof ActivityContext) {
            ctx.annoation = Object.assign(ctx.annoation || {}, { sequence: activities, module: SequenceActivity });
        } else {
            activities.unshift(ctx);
            ctx = { sequence: activities, module: SequenceActivity } as SequenceOption<T>;
        }

        let runner = await Workflow.run(ctx);
        return runner;
    }

    /**
     * run activity.
     *
     * @static
     * @template T
     * @param {(Type<any> | ControlType<T> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async run<T extends ActivityContext>(target: Type<any> | ControlType<T> | T, ...args: string[]): Promise<T> {
        return await new Workflow(target).run(...args) as T;
    }

    protected initContext(args: string[]) {
        super.initContext(args);
        this.context.id = this.context.id || this.createUUID();
    }

    protected createUUID() {
        let container = this.getPools().getRoot();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
