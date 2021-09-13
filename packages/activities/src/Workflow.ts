import { Type, isClass, isArray, LoadType } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { Application, checkBootArgs } from '@tsdi/boot';
import { ComponentsModule } from '@tsdi/components';
import { ActivityModule } from './ActivityModule';
import { SequenceActivity } from './activities';
import { ActivityOption } from './core/ActivityOption';
import { WorkflowInstance, WorkflowContext } from './core/WorkflowContext';
import { ActivityType } from './core/ActivityMetadata';
import { UUIDToken, RandomUUIDFactory } from './core/uuid';
import { WorkflowContextToken } from './core/IWorkflowContext';

/**
 * workflow builder.
 *
 * @export
 * @class Workflow
 * @extends {Application}
 */
export class Workflow<T extends WorkflowContext = WorkflowContext> extends Application implements ContextInit {

    protected onInit(target: Type | ActivityOption<T> | T) {
        if (!isClass(target)) {
            if (!target.type) {
                let options = target instanceof WorkflowContext ? target.getOptions() : target;
                options.type = SequenceActivity;
                options.template = isArray(options.template) ? options.template : [options.template];
            }
        }
        super.onInit(target);
    }


    getWorkflow(workflowId: string): WorkflowInstance {
        return this.getContainer().get(workflowId);
    }

    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {T} ctx
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async sequence<T extends WorkflowContext>(ctx: T): Promise<T>;
    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {Type} type
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async sequence<T extends WorkflowContext>(type: Type): Promise<T>;
    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {...ActivityType<T>[]} activities
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async sequence<T extends WorkflowContext>(...activities: ActivityType[]): Promise<T>;
    static async sequence<T extends WorkflowContext>(...activities: any[]): Promise<T> {
        if (activities.length === 1) {
            let actType = activities[0];
            if (isClass(actType)) {
                return await Workflow.run<T>(actType);
            } else if (actType instanceof WorkflowContext) {
                return await Workflow.run(actType as T);
            } else {
                return await Workflow.run<T>((actType && actType.template) ? actType : { template: actType });
            }
        } else if (activities.length > 1) {
            let option = { template: activities, type: SequenceActivity, staticSeq: true } as ActivityOption<T>;
            return await Workflow.run<T>(option);
        }
    }

    /**
     * run activity.
     *
     * @static
     * @template T
     * @param {(T | Type | ActivityOption<T>)} target
     * @param {(LoadType[] | LoadType | string)} [deps]  workflow run depdences.
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async run<T extends WorkflowContext = WorkflowContext>(target: T | Type | ActivityOption<T>, deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<T> {
        let { deps: depmds, args: envs } = checkBootArgs(deps, ...args);
        return await new Workflow(target, depmds).run(...envs) as T;
    }

    onContextInit(ctx: T) {
        ctx.id = ctx.id || this.createUUID();
        super.onContextInit(ctx);
    }

    protected bindContextToken(ctx: T) {
        this.getContainer().setValue(WorkflowContextToken, ctx);
    }

    protected getBootDeps() {
        let deps = super.getBootDeps();
        if (this.getContainer().has(ActivityModule)) {
            return deps;
        }
        return [AopModule, LogModule, ComponentsModule, ActivityModule, ...deps];
    }

    protected createUUID() {
        let container = this.getContainer();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
