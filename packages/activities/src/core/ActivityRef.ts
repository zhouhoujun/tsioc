import { PromiseUtil, lang, isDefined, Abstract, IDestoryable, isFunction, Type, Inject, Injectable } from '@tsdi/ioc';
import { CTX_TEMPLATE, CTX_ELEMENT_NAME } from '@tsdi/boot';
import { IElementRef, ITemplateRef, IComponentRef, ContextNode, ELEMENT_REFS, COMPONENT_REFS, NodeSelector, CONTEXT_REF, NATIVE_ELEMENT, ROOT_NODES, COMPONENT_TYPE, COMPONENT_INST, TEMPLATE_REF, REFCHILD_SELECTOR } from '@tsdi/components';
import { ActivityContext, CTX_RUN_SCOPE, CTX_RUN_PARENT, CTX_BASEURL, ActivityTemplateContext } from './ActivityContext';
import { IActivityRef, ACTIVITY_OUTPUT } from './IActivityRef';
import { Activity } from './Activity';
import { WorkflowContext } from './WorkflowInstance';
import { ControlActivity } from './ControlActivity';



export interface IActivityElementRef<T extends Activity = Activity> extends IElementRef<T, ActivityContext>, IActivityRef {

}

export interface IActivityTemplateRef<T = ActivityNodeType> extends ITemplateRef<T, ActivityContext>, IActivityRef {

}

export interface IActivityComponentRef<T = any, TN = ActivityNodeType> extends IComponentRef<T, TN, ActivityContext>, IActivityRef {

}


export type ActivityNodeType = Activity | IActivityElementRef | IActivityTemplateRef | IActivityComponentRef;

@Abstract()
export abstract class ActivityRef<T> extends ContextNode<ActivityContext> implements IActivityRef<T> {
    isScope?: boolean;
    abstract readonly name: string;
    abstract run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void>;

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<WorkflowContext> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: WorkflowContext, next?: () => Promise<void>) => this.run(ctx, next);
        }
        return this._actionFunc;
    }
}

@Injectable
export class ActivityElementRef<T extends Activity = Activity> extends ActivityRef<T> implements IActivityElementRef<T> {

    get name(): string {
        return this.context.name ?? this.nativeElement.name ?? lang.getClassName(this.nativeElement);
    }

    constructor(
        @Inject(CONTEXT_REF) context: ActivityContext,
        @Inject(NATIVE_ELEMENT) public readonly nativeElement: T) {
        super(context);
        let injector = context.injector;
        if (!injector.has(ELEMENT_REFS)) {
            injector.setValue(ELEMENT_REFS, new WeakMap());
        }
        injector.getSingleton(ELEMENT_REFS).set(nativeElement, this);
        this.onDestroy(() => injector.getSingleton(ELEMENT_REFS)?.delete(nativeElement));
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<any> {
        let result = await this.nativeElement.execute(this.context);
        if (isDefined(result)) {
            this.context.setValue(ACTIVITY_OUTPUT, result);
            this.context.getValue(CTX_RUN_PARENT)?.setValue(ACTIVITY_OUTPUT, result);
            this.context.runScope?.setValue(ACTIVITY_OUTPUT, result);
        } else {
            this.context.remove(ACTIVITY_OUTPUT);
        }

        if (next) {
            await next();
        }
    }

    protected destroying(): void {
        let element = this.nativeElement as T & IDestoryable;
        if (element && isFunction(element.destroy)) {
            element.destroy();
        }
        super.destroying();
    }
}

@Injectable
export class ControlActivityElementRef<T extends ControlActivity = ControlActivity> extends ActivityElementRef<T> {

}

@Injectable
export class ActivityTemplateRef<T extends ActivityNodeType = ActivityNodeType> extends ActivityRef<T> implements IActivityTemplateRef<T> {
    readonly isScope = true;
    get name(): string {
        return `${this.context.name}.template`;
    }

    get template() {
        return this.context.getValue(CTX_TEMPLATE);
    }

    private _rootNodes: T[]
    get rootNodes(): T[] {
        return this._rootNodes;
    }

    constructor(
        @Inject(CONTEXT_REF) context: ActivityTemplateContext,
        @Inject(ROOT_NODES) nodes: T[]) {
        super(context);
        this._rootNodes = nodes;
    }


    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        this.context.setValue(CTX_RUN_SCOPE, this.context);
        let result = await this.context.getExector().runActivity(this.rootNodes);
        this.context.remove(CTX_RUN_SCOPE);
        if (isDefined(result)) {
            this.context.getValue(CTX_RUN_PARENT)?.setValue(ACTIVITY_OUTPUT, result);
            this.context.runScope?.setValue(ACTIVITY_OUTPUT, result);
        } else {
            this.context.remove(ACTIVITY_OUTPUT);
        }

        if (next) {
            await next();
        }
    }

    protected destroying(): void {
        this.rootNodes
            .forEach((node: T & IDestoryable) => {
                if (node && isFunction(node.destroy)) {
                    node.destroy();
                }
            });
        this._rootNodes.length = 0;
        delete this._rootNodes;
        super.destroying();
    }
}


/**
 *  activity ref for runtime.
 */
@Injectable
export class ActivityComponentRef<T = any, TN = ActivityNodeType> extends ActivityRef<T> implements IActivityComponentRef<T, TN> {

    get name(): string {
        return this.context?.name ?? lang.getClassName(this.componentType);
    }

    get selector() {
        return this.context.getValue(REFCHILD_SELECTOR);
    }

    constructor(
        @Inject(COMPONENT_TYPE) public readonly componentType: Type<T>,
        @Inject(COMPONENT_INST) public readonly instance: T,
        @Inject(CONTEXT_REF) context: ActivityContext,
        @Inject(TEMPLATE_REF) public readonly nodeRef: IActivityTemplateRef<TN>
    ) {
        super(context);
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.setValue(COMPONENT_REFS, new WeakMap());
        }
        context.set(CTX_ELEMENT_NAME, this.name);
        let baseURL = context.annoation?.baseURL;
        baseURL && context.setValue(CTX_BASEURL, baseURL);
        let injector = context.injector;
        injector.getSingleton(COMPONENT_REFS).set(instance, this);
        this.onDestroy(() => injector.getSingleton(COMPONENT_REFS)?.delete(this.instance));
    }

    getNodeSelector(): NodeSelector {
        return new NodeSelector(this.nodeRef);
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        let nodeRef = this.nodeRef;
        await nodeRef.run(ctx);
        if (next) {
            await next();
        }
    }

}



/**
 * is acitivty ref instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvityRef(target: any): target is IActivityRef {
    return target instanceof ActivityRef;
}

