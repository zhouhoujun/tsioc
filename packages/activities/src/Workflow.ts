import { Type, isClass, LoadType, isArray } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { BootApplication, ContextInit, checkBootArgs } from '@tsdi/boot';
import { ComponentsModule } from '@tsdi/components';
import {
    UUIDToken, RandomUUIDFactory, WorkflowInstance, ActivityContext,
    ActivityType, ActivityOption, WorkflowContextToken
} from './core';

import { ActivityModule } from './ActivityModule';
import { SequenceActivity } from './activities';

/**
 * workflow builder.
 *
 * @export
 * @class Workflow
 * @extends {BootApplication}
 */
export class Workflow<T extends ActivityContext = ActivityContext> extends BootApplication<T> implements ContextInit {

    protected onInit(target: Type | ActivityOption<T> | T) {
        if (!isClass(target)) {
            if (!target.module) {
                target.module = SequenceActivity;
                target.template = isArray(target.template) ? target.template : [target.template];
            }
        }
        super.onInit(target);
    }


    getWorkflow(workflowId: string): WorkflowInstance {
        return this.getPools().getRoot().get(workflowId);
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
    static async sequence<T extends ActivityContext>(ctx: T): Promise<T>;
    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {Type} type
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async sequence<T extends ActivityContext>(type: Type): Promise<T>;
    /**
     * run sequence.
     *
     * @static
     * @template T
     * @param {...ActivityType<T>[]} activities
     * @returns {Promise<T>}
     * @memberof Workflow
     */
    static async sequence<T extends ActivityContext>(...activities: ActivityType[]): Promise<T>;
    static async sequence<T extends ActivityContext>(...activities: any[]): Promise<T> {
        if (activities.length > 1) {
            let option = { template: activities, module: SequenceActivity, staticSeq: true } as ActivityOption<T>;
            return await Workflow.run<T>(option);
        } else if (activities.length === 1) {
            let actType = activities[0];
            if (isClass(actType)) {
                return await Workflow.run<T>(actType);
            } else if (actType instanceof ActivityContext) {
                return await Workflow.run(actType as T);
            } else {
                return await Workflow.run<T>((actType && actType.template) ? actType : { template: actType });
            }
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
    static async run<T extends ActivityContext = ActivityContext>(target: T | Type | ActivityOption<T>, deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<T> {
        let { deps: depmds, args: envs } = checkBootArgs(deps, ...args);
        return await new Workflow(target, depmds).run(...envs) as T;
    }

    onContextInit(ctx: T) {
        ctx.id = ctx.id || this.createUUID();
        super.onContextInit(ctx);
    }

    protected bindContextToken(ctx: T) {
        this.container.bindProvider(WorkflowContextToken, ctx);
    }

    protected getBootDeps() {
        let deps = super.getBootDeps();
        if (!isClass(this.target) && this.target['staticSeq']) {
            deps = [];
            this.target.template.forEach(t => {
                deps.push(... this.getTargetDeps(t));
            });
        }
        if (this.container.has(ActivityModule)) {
            return deps;
        }
        return [AopModule, LogModule, ComponentsModule, ActivityModule, ...deps];
    }

    protected createUUID() {
        let container = this.getPools().getRoot();
        if (!container.has(UUIDToken)) {
            container.register(RandomUUIDFactory);
        }
        return container.get(UUIDToken).generate();
    }
}
