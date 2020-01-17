import { PromiseUtil, lang, isDefined, Abstract, IDestoryable, isFunction, Type } from '@tsdi/ioc';
import { CTX_TEMPLATE } from '@tsdi/boot';
import { IElementRef, ITemplateRef, IComponentRef, ContextNode, ELEMENT_REFS, COMPONENT_REFS, NodeSelector } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import { IActivityRef, ACTIVITY_OUTPUT } from './IActivityRef';
import { Activity } from './Activity';
import { WorkflowContext } from './WorkflowInstance';



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

export class ActivityElementRef<T extends Activity = Activity> extends ActivityRef<T> implements IActivityElementRef<T> {

    get name(): string {
        return this.nativeElement.name ?? lang.getClassName(this.nativeElement);
    }

    constructor(context: ActivityContext, public readonly nativeElement: T) {
        super(context);
        let injector = context.injector;
        if (!injector.has(ELEMENT_REFS)) {
            injector.registerValue(ELEMENT_REFS, new WeakMap());
        }
        injector.get(ELEMENT_REFS).set(nativeElement, this);
        this.onDestroy(() => injector.get(ELEMENT_REFS)?.delete(nativeElement));
    }

    protected destroying(): void {
        let element = this.nativeElement as T & IDestoryable;
        if (element && isFunction(element.destroy)) {
            element.destroy();
        }
        super.destroy();
    }

    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<any> {
        ctx.status.current = this;
        this.context.remove(ACTIVITY_OUTPUT);
        let result = await this.nativeElement.execute(this.context);
        if (isDefined(result)) {
            this.context.set(ACTIVITY_OUTPUT, result);
        }

        if (next) {
            await next();
        }
    }
}

export class ActivityTemplateRef<T extends ActivityNodeType = ActivityNodeType> extends ActivityRef<T> implements IActivityTemplateRef<T> {
    readonly isScope = true;
    get name(): string {
        return this.context.getOptions()?.name;
    }

    get template() {
        return this.context.get(CTX_TEMPLATE);
    }

    private _rootNodes: T[]
    get rootNodes(): T[] {
        return this._rootNodes;
    }

    constructor(context: ActivityContext, nodes: T[]) {
        super(context);
        this._rootNodes = nodes;
    }


    /**
     * run activity.
     * @param ctx root context.
     * @param next next work.
     */
    async run(ctx: WorkflowContext, next?: () => Promise<void>): Promise<void> {
        this.context.remove(ACTIVITY_OUTPUT);
        ctx.status.current = this;
        let result = await this.context.getExector().runActivity(this.rootNodes);
        if (isDefined(result)) {
            this.context.set(ACTIVITY_OUTPUT, result);
        }
        ctx.status.scopeEnd();
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
        super.destroy();
    }
}


/**
 *  activity ref for runtime.
 */
export class ActivityComponentRef<T = any, TN = ActivityNodeType> extends ActivityRef<T> implements IActivityComponentRef<T, TN> {

    get name(): string {
        return this.context.getOptions()?.name || lang.getClassName(this.componentType);
    }

    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        context: ActivityContext,
        public readonly nodeRef: IActivityTemplateRef<TN>
    ) {
        super(context);
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.registerValue(COMPONENT_REFS, new WeakMap());
        }
        let injector = context.injector;
        injector.get(COMPONENT_REFS).set(instance, this);
        this.onDestroy(() => injector.get(COMPONENT_REFS)?.delete(this.instance));
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
        ctx.status.current = this;
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
    return target instanceof ActivityTemplateRef || target instanceof ActivityComponentRef;
}

