import { PromiseUtil, lang, Abstract, IDestoryable, isFunction, Type, Inject, isString, Injectable, Refs, isDefined, tokenId, AsyncHandler } from '@tsdi/ioc';
import { CTX_TEMPLATE, CTX_ELEMENT_NAME, Service, Startup, BootContext, Handle } from '@tsdi/boot';
import {
    IElementRef, ITemplateRef, IComponentRef, ContextNode, ELEMENT_REFS, COMPONENT_REFS,
    NodeSelector, CONTEXT_REF, NATIVE_ELEMENT, ROOT_NODES, COMPONENT_TYPE, COMPONENT_INST, TEMPLATE_REF, REFCHILD_SELECTOR
} from '@tsdi/components';
import { CTX_RUN_SCOPE, CTX_RUN_PARENT, CTX_BASEURL } from './IActivityContext';
import { ActivityContext, ActivityTemplateContext } from './ActivityContext';
import { IActivityRef, ACTIVITY_DATA, ACTIVITY_INPUT, ACTIVITY_ORIGIN_DATA } from './IActivityRef';
import { Activity } from './Activity';
import { ControlActivity } from './ControlActivity';
import { expExp } from '../utils/exps';
import { ActivityOption } from './ActivityOption';
import { TemplateOption } from './ActivityMetadata';
import { IWorkflowContext } from './IWorkflowContext';


/**
 * each body token.
 */
export const CTX_CURR_ACT_REF = tokenId<any>('CTX_CURR_ACT_REF');
/**
 * each body token.
 */
export const CTX_CURR_ACTSCOPE_REF = tokenId<any>('CTX_CURR_ACTSCOPE_REF');

/**
 *run state.
 *
 * @export
 * @enum {number}
 */
export enum RunState {
    /**
     * activity init.
     */
    init,
    /**
     * runing.
     */
    running,
    /**
     * activity parused.
     */
    pause,
    /**
     * activity stopped.
     */
    stop,
    /**
     * activity complete.
     */
    complete
}




@Injectable
@Refs(Activity, BootContext)
export class WorkflowContext extends BootContext<ActivityOption> implements IWorkflowContext {
    /**
    * workflow id.
    *
    * @type {string}
    * @memberof ActivityContext
    */
    id: string;
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityOption
    */
    name: string;

    get result() {
        return this.getValue(ACTIVITY_DATA);
    }

    getStartup(): WorkflowInstance {
        return super.getStartup() as WorkflowInstance;
    }

    setOptions(options: ActivityOption) {
        if (!options) {
            return this;
        }
        if (isDefined(options.data)) {
            this.setValue(ACTIVITY_INPUT, options.data);
        }
        return super.setOptions(options);
    }
}





export interface IActivityElementRef<T extends Activity = Activity> extends IElementRef<T, ActivityContext>, IActivityRef {

}

export interface IActivityTemplateRef<T = ActivityNodeType> extends ITemplateRef<T, ActivityContext>, IActivityRef {

}

export interface IActivityComponentRef<T = any, TN = ActivityNodeType> extends IComponentRef<T, TN, ActivityContext>, IActivityRef {

}


export type ActivityNodeType = Activity | IActivityElementRef | IActivityTemplateRef | IActivityComponentRef;

@Abstract()
export abstract class ActivityRef extends ContextNode<ActivityContext> implements IActivityRef {
    isScope?: boolean;
    abstract readonly name: string;
    protected abstract execute(ctx: IWorkflowContext): Promise<any>;

    /**
     * run activity.
     * @param ctx root context.
     */
    async run(ctx: IWorkflowContext): Promise<void> {
        let externals = await this.context.resolveExpression(this.context.getTemplate<TemplateOption>()?.externals);
        let orginData = this.context.getData();
        if (externals) {
            let input = externals.input;
            if (isDefined(input)) {
                if (isString(input) && expExp.test(input)) {
                    input = this.context.getExector().eval(input);
                }
                this.context.setValue(ACTIVITY_INPUT, input);
            }
            let data = externals.data;
            if (isDefined(data)) {
                this.context.setValue(ACTIVITY_ORIGIN_DATA, orginData);
                if (isString(data) && expExp.test(data)) {
                    data = this.context.getExector().eval(data);
                }
                this.context.setValue(ACTIVITY_DATA, data);
                this.context.setValue(CTX_RUN_SCOPE, this.context);
            }
        }
        let result = await this.execute(ctx);
        if (isDefined(result)) {
            this.context.setValue(ACTIVITY_DATA, result);
            if (this.context.hasValue(ACTIVITY_ORIGIN_DATA)) {
                this.context.remove(CTX_RUN_SCOPE);
            } else {
                // console.log(this.context.name, 'set data to', this.context.getValue<IActivityContext>(CTX_RUN_PARENT)?.name);
                // console.log(this.context.name, 'set data to', this.context.runScope?.name);
                this.context.getValue(CTX_RUN_PARENT)?.setValue(ACTIVITY_DATA, result);
                this.context.runScope?.setValue(ACTIVITY_DATA, result);
            }
        }
    }

    private _actionFunc: AsyncHandler;
    toAction(): AsyncHandler<IWorkflowContext> {
        if (!this._actionFunc) {
            this._actionFunc = async (ctx: IWorkflowContext, next?: () => Promise<void>) => {
                await this.run(ctx);
                if (next) {
                    await next()
                }
            }
        }
        return this._actionFunc;
    }
}

@Injectable
export class ActivityElementRef<T extends Activity = Activity> extends ActivityRef implements IActivityElementRef<T> {

    get name(): string {
        return this.context.name;
    }

    constructor(
        @Inject(CONTEXT_REF) context: ActivityContext,
        @Inject(NATIVE_ELEMENT) public readonly nativeElement: T) {
        super(context);
        let injector = context.injector;
        if (!injector.has(ELEMENT_REFS)) {
            injector.setValue(ELEMENT_REFS, new WeakMap());
        }
        if (!this.context.name) {
            this.context.setValue(CTX_ELEMENT_NAME, this.nativeElement.name ?? lang.getClassName(this.nativeElement));
        }
        injector.getSingleton(ELEMENT_REFS).set(nativeElement, this);
        this.onDestroy(() => injector.getSingleton(ELEMENT_REFS)?.delete(nativeElement));
    }

    /**
     * run activity.
     * @param ctx root context.
     */
    protected execute(ctx: WorkflowContext): Promise<any> {
        return this.nativeElement.execute(this.context);
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
export class ActivityTemplateRef<T extends ActivityNodeType = ActivityNodeType> extends ActivityRef implements IActivityTemplateRef<T> {
    readonly isScope = true;
    get name(): string {
        return `${this.context.name || ''}.template`;
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
     */
    protected async execute(ctx: WorkflowContext): Promise<any> {
        this.context.setValue(CTX_RUN_SCOPE, this.context);
        await this.context.getExector().runActivity(this.rootNodes);
        this.context.remove(CTX_RUN_SCOPE);
        return this.context.getData();
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
export class ActivityComponentRef<T = any, TN = ActivityNodeType> extends ActivityRef implements IActivityComponentRef<T, TN> {

    get name(): string {
        return this.context?.name;
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
        if (!context.name) {
            context.set(CTX_ELEMENT_NAME, lang.getClassName(this.componentType));
        }
        let baseURL = context.getAnnoation()?.baseURL;
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
    protected async execute(ctx: WorkflowContext): Promise<void> {
        await this.nodeRef.run(ctx);
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

/**
 * task runner.
 *
 * @export
 * @class TaskRunner
 * @implements {ITaskRunner}
 */
@Injectable
@Refs(ActivityRef, Startup)
export class WorkflowInstance<T extends IActivityRef = IActivityRef> extends Service<T> {

    async configureService(ctx: WorkflowContext): Promise<void> {
        this.context = ctx;
    }

    getContext(): WorkflowContext {
        return this.context as WorkflowContext;
    }

    get result(): any {
        return this.context.getValue(ACTIVITY_DATA);
    }

    state: RunState;

    async start(data?: any): Promise<void> {
        let context = this.getContext();
        let injector = context.injector;
        if (isDefined(data)) {
            context.setValue(ACTIVITY_INPUT, data);
        }
        context.setValue(WorkflowInstance, this);

        if (context.id && !injector.has(context.id)) {
            injector.setValue(context.id, this);
        }

        let target = this.getBoot() as IActivityRef;
        target.context.setValue(CTX_RUN_PARENT, context);
        await target.run(context);
        this.state = RunState.complete;
        target.destroy();
    }

    async stop(): Promise<any> {
        this.state = RunState.stop;
    }

    async pause(): Promise<any> {
        this.state = RunState.pause;
    }

}

