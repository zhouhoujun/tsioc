import { Action, Actions } from '../action';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { AnnotationType, ClassType, EMPTY_OBJ, Type } from '../types';
import { assign, cleanObj, getParentClass } from '../utils/lang';
import { isFunction } from '../utils/chk';
import { runChain, Handle } from '../handle';
import {
    ParameterMetadata, PropertyMetadata, ProvidersMetadata, ClassMetadata,
    RunnableMetadata, InjectableMetadata, MethodMetadata
} from './meta';
import {
    ctorName, DecoratorType, DecorContext, DecorDefine, Decors, ActionTypes,
    Class, TypeDef, DecoratorFn
} from './type';
import { Platform } from '../platform';
import { InvokeOptions } from '../context';



export type ActionType = 'propInject' | 'paramInject' | 'annoation' | 'runnable'
    | 'typeProviders' | 'methodProviders';


/**
 * decorator def hanldes.
 */
export interface DecorDefHandles<T = any> {
    /**
     * class decorator def handle.
     */
    class?: Handle<DecorContext<T>> | Handle<DecorContext<T>>[];
    /**
     * method decorator def handle.
     */
    method?: Handle<DecorContext<T>> | Handle<DecorContext<T>>[];
    /**
     * property decorator def handle.
     */
    property?: Handle<DecorContext<T>> | Handle<DecorContext<T>>[];
    /**
     * parameter decorator def handle.
     */
    parameter?: Handle<DecorContext<T>> | Handle<DecorContext<T>>[];
}

/**
 * design action scope hanldes.
 * raise handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
 */
export interface DesignScopeHandles<T> {
    /**
     * decorator BeforeAnnoation action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
     */
    beforeAnnoation?: Handle<T> | Handle<T>[];

    /**
     * decorator Class action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
     */
    class?: Handle<T> | Handle<T>[];

    /**
     * decorator Property action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
     */
    property?: Handle<T> | Handle<T>[];

    /**
     * decorator Method action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
     */
    method?: Handle<T> | Handle<T>[];

    /**
     * decorator Annoation action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
     */
    annoation?: Handle<T> | Handle<T>[];

    /**
     * decorator AfterAnnoation action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
     */
    afterAnnoation?: Handle<T> | Handle<T>[];
}

/**
 * runtime action scope hanldes.
 * raise handles order by beforeConstructor -> afterConstructor -> property -> method -> class
 */
export interface RuntimeScopeHandles<T> {
    /**
     * decorator BeforeConstructor action handles.
     * raise handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    beforeConstructor?: Handle<T> | Handle<T>[];

    /**
     * decorator AfterConstructor action handles.
     * raise handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    afterConstructor?: Handle<T> | Handle<T>[];

    /**
     * decorator Property action handles.
     * raise handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    property?: Handle<T> | Handle<T>[];

    /**
     * decorator Method action handles.
     * raise handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    method?: Handle<T> | Handle<T>[];

    /**
     * decorator Class action handles.
     * raise handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    class?: Handle<T> | Handle<T>[];

}


/**
 * decorator register options.
 */
export interface DecorRegisterOption<T = any> {
    /**
     * decorator basic action type.
     */
    actionType?: ActionType | ActionType[];
    /**
     * set def handles.
     * raise when init decorator metadate of Type.
     */
    def?: DecorDefHandles<T>;
    /**
     * set design action scope handles.
     * raise when Type inject.
     * raise design handles order by beforeAnnoation -> class -> property -> method -> annoation ->  afterAnnoation
     */
    design?: DesignScopeHandles<DesignContext>
    /**
     * set runtime action scope handles.
     * raise when resolve instance of Type.
     * raise runtime handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    runtime?: RuntimeScopeHandles<RuntimeContext>;
}

/**
 * metadata factory. parse args to metadata.
 */
export interface MetadataFactory<T = any> extends ProvidersMetadata {
    /**
     * parse args as metadata props.
     * @param args
     */
    props?(...args: any[]): T;
    /**
     * append metadata.
     * @param metadata
     */
    appendProps?(metadata: T): void;
    /**
     * init decor context.
     */
    init?: (ctx: DecorContext<T>) => void;
    /**
     * after init decor context.
     */
    afterInit?: (ctx: DecorContext<T>) => void;
}

/**
 * decorator option.
 */
export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption<T> { }


/**
 * create decorator define.
 * @param name 
 * @param decor 
 * @param metadata 
 * @param decorType 
 * @param options 
 * @param propertyKey 
 * @param parameterIndex 
 * @returns decorator define
 */
export function toDefine<T>(decor: DecoratorFn, metadata: T, decorType: DecoratorType, options: MetadataFactory<any>, propertyKey?: string, parameterIndex?: number): DecorDefine<T> {

    const providers = options.providers || [];

    return {
        decor,
        propertyKey: propertyKey!,
        parameterIndex,
        decorType,
        metadata,
        providers
    }
}



export function regActionType(decor: string, type: ActionType) {
    switch (type) {
        case ActionTypes.annoation:
            typeAnnoDecors[decor] = true;
            break;
        case ActionTypes.paramInject:
            paramInjectDecors[decor] = true;
            break;
        case ActionTypes.propInject:
            propInjectDecors[decor] = true;
            break;
        case ActionTypes.runnable:
            runnableDecors[decor] = true;
            break;
        case ActionTypes.typeProviders:
            typeProvidersDecors[decor] = true;
            break;
        case ActionTypes.methodProviders:
            methodProvidersDecors[decor] = true;
            break;
        default:
            return
    }
}

const paramInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true, '@Param': true, '@Nullable': true };
export const ParamInjectAction = (ctx: DecorContext, next: () => void) => {
    if (paramInjectDecors[ctx.define.decor.toString()]) {
        const def = ctx.class;
        const meta = ctx.define.metadata as ParameterMetadata;
        const propertyKey = ctx.define.propertyKey;
        let params = def.hasParameters(propertyKey) ? def.getParameters(propertyKey) : null;
        if (!params) {
            const names = def.getParamNames(propertyKey);
            let paramTypes: any[];
            if (propertyKey === ctorName) {
                paramTypes = Reflect.getMetadata('design:paramtypes', def.type)
            } else {
                paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey)
            }
            if (paramTypes) {
                params = paramTypes.map((type, index) => ({ type, name: names[index] }));
                def.setParameters(propertyKey, params)
            }
        }
        if (params) {
            const idx = ctx.define.parameterIndex || 0;
            const desgmeta = params[idx] || EMPTY_OBJ;
            assign(meta, desgmeta);
            params.splice(idx, 1, meta)
        }
    }
    return next()
}


export const InitPropDesignAction = (ctx: DecorContext, next: () => void) => {
    if (!(ctx.define.metadata as PropertyMetadata).type) {
        let type = Reflect.getOwnMetadata('design:type', ctx.target, ctx.define.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', ctx.target.constructor, ctx.define.propertyKey);
        }
        (ctx.define.metadata as PropertyMetadata).type = type;
    }
    return next()
}



const propInjectDecors: Record<string, boolean> = { '@Inject': true, '@Autowired': true };
export const PropInjectAction = (ctx: DecorContext, next: () => void) => {
    if (propInjectDecors[ctx.define.decor.toString()]) {
        ctx.class.setProperyProviders(ctx.define.propertyKey, [ctx.define.metadata])
    }
    return next()
}


export const InitCtorDesignParams = (ctx: DecorContext, next: () => void) => {
    if (!ctx.class.hasParameters(ctorName)) {
        let paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.class.type);
        if (paramTypes) {
            const names = ctx.class.getParamNames(ctorName);
            if (!paramTypes) {
                paramTypes = []
            }
            ctx.class.setParameters(ctorName, paramTypes.map((type, index) => {
                return { type, name: names[index] }
            }))
        }
    }
    return next()
}

const typeAnnoDecors: Record<string, boolean> = { '@Injectable': true, '@Singleton': true, '@Abstract': true, '@Static': true };
export const TypeAnnoAction = (ctx: DecorContext, next: () => void) => {
    if (typeAnnoDecors[ctx.define.decor.toString()]) {
        const def = ctx.class;
        const meta = ctx.define.metadata as ClassMetadata & InjectableMetadata;
        if (meta.abstract) {
            def.getAnnotation().abstract = true
        }

        if (meta.singleton) {
            def.getAnnotation().singleton = true
        }
        if (meta.static) {
            def.getAnnotation().static = true
        }
        if (meta.provide && def.provides.indexOf(meta.provide) < 0) {
            def.provides.push(meta.provide)
        }
        if (meta.expires) {
            def.getAnnotation().expires = meta.expires
        }

        if (ctx.define.providers) {
            def.providers.push(...ctx.define.providers)
        }

        if (meta.providedIn) {
            def.getAnnotation().providedIn = meta.providedIn
        }
    }
    return next()
};

const runnableDecors: Record<string, boolean> = { '@Autorun': true, '@IocExt': true };
export const RunnableAction = (ctx: DecorContext, next: () => void) => {
    if (runnableDecors[ctx.define.decor.toString()]) {
        const metadata = ctx.define.metadata as RunnableMetadata<any>;
        (metadata as any).decorType = ctx.define.decorType,
            metadata.method = metadata.method ?? ctx.define.propertyKey,
            metadata.order = ctx.define.decorType === Decors.CLASS ? 0 : metadata.order
        ctx.class.runnables.push(ctx.define.metadata);
        ctx.class.runnables.sort((au1, au2) => au1.order! - au2.order!)
    }
    return next()
}

const typeProvidersDecors: Record<string, boolean> = { '@Injectable': true, '@Providers': true };
export const TypeProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (typeProvidersDecors[ctx.define.decor.toString()]) {
        if ((ctx.define.metadata as ProvidersMetadata).providers) {
            ctx.class.providers.push(...(ctx.define.metadata as ProvidersMetadata).providers!)
        }
    }
    return next()
}

export const InitMethodDesignParams = (ctx: DecorContext, next: () => void) => {
    const reflective = ctx.class;
    const method = ctx.define.propertyKey;
    if (!reflective.hasParameters(method)) {
        const names = reflective.getParamNames(method);
        reflective.setParameters(method,
            (Reflect.getMetadata('design:paramtypes', ctx.target, method) as Type[]).map((type, idx) => ({ type, name: names[idx] })))
    }
    const meta = ctx.define.metadata as MethodMetadata;
    if (!meta.type) {
        meta.type = Reflect.getMetadata('design:returntype', ctx.target, method)
    }
    if (!reflective.hasReturnning(method) && meta.type) {
        reflective.setReturnning(method, meta.type)
    }
    return next()
}

const methodProvidersDecors: Record<string, boolean> = { '@Providers': true, '@Autowired': true };
export const MethodProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (methodProvidersDecors[ctx.define.decor.toString()]) {
        const mpdrs = (ctx.define.metadata as MethodMetadata) as InvokeOptions<any>;
        if (mpdrs) {
            ctx.class.setMethodOptions(ctx.define.propertyKey, mpdrs)
        }
    }
    return next()
}

export const ExecuteDecorHandle = (ctx: DecorContext, next: () => void) => {
    if (ctx.define.decor.getHandle) {
        const handles = ctx.define.decor.getHandle(ctx.define.decorType);
        runChain(handles, ctx)
    }
    return next()
}


class DecorActions extends Actions<DecorContext> {
    protected override getPlatform(ctx: DecorContext): Platform { return null!; }
    protected override parseHandle(provider: Platform, ac: any): Handle {
        if (isFunction(ac)) {
            return ac
        } else if (ac instanceof Action) {
            return ac.getHandle()
        }
        return null!
    }
}

export const typeDecorActions: Actions<DecorContext> = new DecorActions();
export const propDecorActions: Actions<DecorContext> = new DecorActions();
export const methodDecorActions: Actions<DecorContext> = new DecorActions();
export const paramDecorActions: Actions<DecorContext> = new DecorActions();


typeDecorActions.use(
    InitCtorDesignParams,
    TypeAnnoAction,
    TypeProvidersAction,
    RunnableAction,
    ExecuteDecorHandle
);

methodDecorActions.use(
    InitMethodDesignParams,
    MethodProvidersAction,
    RunnableAction,
    ExecuteDecorHandle
);

propDecorActions.use(
    InitPropDesignAction,
    PropInjectAction,
    ExecuteDecorHandle
);
paramDecorActions.use(
    ParamInjectAction,
    ExecuteDecorHandle
);

function dispatch(actions: Actions<DecorContext>, target: any, type: ClassType, define: DecorDefine, options: DecoratorOption<any>) {
    const ctx = {
        define,
        target,
        class: get(type)
    } as DecorContext;
    options.init && options.init(ctx);
    actions.handle(ctx, () => {
        ctx.class.addDefine(define)
    });
    options.afterInit && options.afterInit(ctx);
    cleanObj(ctx)
}

export function dispatchTypeDecor(type: ClassType, define: DecorDefine, options: DecoratorOption<any>) {
    dispatch(typeDecorActions, type, type, define, options)
}

export function dispatchPorpDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    if(!define.metadata.propertyKey) define.metadata.propertyKey = define.propertyKey;
    dispatch(propDecorActions, type, type.constructor, define, options)
}

export function dispatchMethodDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    if(!define.metadata.propertyKey) define.metadata.propertyKey = define.propertyKey;
    dispatch(methodDecorActions, type, type.constructor, define, options)
}

export function dispatchParamDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
    const target = type;
    if (!define.propertyKey) {
        define.propertyKey = ctorName
    } else {
        type = type.constructor
    }
    if(!define.metadata.propertyKey) define.metadata.propertyKey = define.propertyKey;
    dispatch(paramDecorActions, target, type, define, options)
}

/**
 * get type def.
 * @param type class type.
 */
export function getDef<T extends TypeDef>(type: ClassType): T {
    let tagAnn = (type as AnnotationType).ƿAnn?.() as TypeDef;
    if (tagAnn?.type !== type) {
        tagAnn = {
            name: type.name,
            type
        };
        (type as AnnotationType).ƿAnn = () => tagAnn;

    }
    return tagAnn as T
}


/**
 * get type Reflective.
 * @param type class type.
 */
export function get<T = any>(type: ClassType<T>): Class<T> {
    let tagRefl = (type as AnnotationType).ƿRef?.() as Class<T>;
    if (tagRefl?.type !== type) {
        let prRef: Class = tagRefl;
        if (!prRef) {
            const parentType = getParentClass(type);
            if (parentType) {
                prRef = get(parentType)
            }
        }
        tagRefl = new Class(type, getDef(type), prRef);
        (type as AnnotationType).ƿRef = () => tagRefl;

    }
    return tagRefl;
}
