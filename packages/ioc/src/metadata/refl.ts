import { Action, Actions } from '../action';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { AnnotationType, ClassType, ObjectMap, Type } from '../types';
import { EMPTY, isArray, isFunction } from '../utils/chk';
import { ParameterMetadata, PropertyMetadata, ProvidersMetadata, AutorunMetadata, InjectableMetadata } from './meta';
import { DecoratorType, DecorContext, DecorDefine, TypeReflect } from './type';
import { TypeDefine } from './typedef';
import { chain, Handler } from '../utils/hdl';
import { cleanObj, getParentClass } from '../utils/lang';
import { ActionProvider } from '../injector';



export type DecorActionType = 'propInject' | 'paramInject' | 'annoation' | 'autorun' | 'typeProviders' | 'methodProviders';

/**
 * decorator reflect hanldes.
 */
export interface DecorReflectHandles {
    /**
     * class decorator reflect handle.
     */
    class?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * method decorator reflect handle.
     */
    method?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * property decorator reflect handle.
     */
    property?: Handler<DecorContext> | Handler<DecorContext>[];
    /**
     * parameter decorator reflect handle.
     */
    parameter?: Handler<DecorContext> | Handler<DecorContext>[];
}

/**
 * decorator action scope hanldes.
 */
export interface DecorScopeHandles<T> {
    /**
     * decorator BeforeAnnoation action handles.
     */
    beforeAnnoation?: Handler<T> | Handler<T>[];

    /**
     * decorator Class action handles.
     */
    class?: Handler<T> | Handler<T>[];

    /**
     * decorator Parameter action handles.
     */
    parameter?: Handler<T> | Handler<T>[];

    /**
     * decorator Property action handles.
     */
    property?: Handler<T> | Handler<T>[];

    /**
     * decorator Method action handles.
     */
    method?: Handler<T> | Handler<T>[];

    /**
     * decorator BeforeConstructor action handles.
     */
    beforeConstructor?: Handler<T> | Handler<T>[];

    /**
     * decorator AfterConstructor action handles.
     */
    afterConstructor?: Handler<T> | Handler<T>[];

    /**
     * decorator Annoation action handles.
     */
    annoation?: Handler<T> | Handler<T>[];

    /**
     * decorator AfterAnnoation action handles.
     */
    afterAnnoation?: Handler<T> | Handler<T>[];
}

/**
 * decorator register options.
 */
export interface DecorRegisterOption extends ProvidersMetadata {
    /**
     * decorator basic action type.
     */
    actionType?: DecorActionType | DecorActionType[];
    /**
     * set reflect handles.
     */
    reflect?: DecorReflectHandles;
    /**
     * set design action scope handles.
     */
    design?: DecorScopeHandles<DesignContext>
    /**
     * set runtime action scope handles.
     */
    runtime?: DecorScopeHandles<RuntimeContext>;
}

/**
 * metadata factory. parse args to metadata.
 */
export interface MetadataFactory<T> {
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
}

/**
 * decorator option.
 */
export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption { }


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
export function toDefine<T>(name: string, decor: string, metadata: T, decorType: DecoratorType, options: DecoratorOption<any>, propertyKey?: string, parameterIndex?: number): DecorDefine<T> {
    if (options.actionType) {
        isArray(options.actionType) ?
            options.actionType.forEach(a => regActionType(decor, a))
            : regActionType(decor, options.actionType);
    }

    const providers = options.providers || [];

    return {
        name,
        decor,
        propertyKey: propertyKey!,
        parameterIndex,
        decorType,
        metadata,
        providers,
        getHandle: options.reflect ? mapToFac(options.reflect as ObjectMap) : emptyHd,
        getDesignHandle: options.design ? mapToFac(options.design as ObjectMap) : emptyHd,
        getRuntimeHandle: options.runtime ? mapToFac(options.runtime as ObjectMap) : emptyHd
    };
}



const emptyHd = (type: any) => EMPTY;

function mapToFac(maps: ObjectMap<Handler | Handler[]>): (type: DecoratorType) => Handler[] {
    const mapHd = new Map();
    for (let type in maps) {
        let rged: Handler[] = mapHd.get(type);
        if (!rged) {
            rged = [];
            mapHd.set(type, rged);
        }
        const handle = maps[type];
        isArray(handle) ? rged.push(...handle) : rged.push(handle);
    }
    return (type: DecoratorType) => mapHd.get(type) ?? EMPTY;
}

function regActionType(decor: string, type: DecorActionType) {
    switch (type) {
        case 'annoation':
            typeAnnoDecors.push(decor);
            break;
        case 'paramInject':
            paramInjectDecors.push(decor);
            break;
        case 'propInject':
            propInjectDecors.push(decor);
            break;
        case 'autorun':
            autorunDecors.push(decor);
            break;
        case 'typeProviders':
            typeProvidersDecors.push(decor);
            break;
        case 'methodProviders':
            methodProvidersDecors.push(decor);
            break;
        default:
            return;
    }
}

export const paramInjectDecors = ['@Inject', '@AutoWired', '@Param'];
export const ParamInjectAction = (ctx: DecorContext, next: () => void) => {
    if (paramInjectDecors.indexOf(ctx.decor) >= 0) {
        const reflect = ctx.reflect;
        let meta = ctx.metadata as ParameterMetadata;
        const propertyKey = ctx.propertyKey;
        let params = reflect.methodParams.get(propertyKey);
        if (!params) {
            const names = reflect.class.getParamNames(propertyKey);
            let paramTypes: any[];
            if (propertyKey === 'constructor') {
                paramTypes = Reflect.getMetadata('design:paramtypes', reflect.type);
            } else {
                paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, propertyKey);
            }
            if (paramTypes) {
                params = paramTypes.map((type, idx) => ({ type, paramName: names[idx] }));
                reflect.methodParams.set(propertyKey, params);
            }
        }
        if (params) {
            meta = { ...meta, ...params[ctx.parameterIndex!] };
            params.splice(ctx.parameterIndex!, 1, meta);
        }
    }
    return next();
};


export const InitPropDesignAction = (ctx: DecorContext, next: () => void) => {
    if (!(ctx.metadata as PropertyMetadata).type) {
        let type = Reflect.getOwnMetadata('design:type', ctx.target, ctx.propertyKey);
        if (!type) {
            // Needed to support react native inheritance
            type = Reflect.getOwnMetadata('design:type', ctx.target.constructor, ctx.propertyKey);
        }
        (ctx.metadata as PropertyMetadata).type = type;
    }
    return next();
}



export const propInjectDecors = ['@Inject', '@AutoWired'];
export const PropInjectAction = (ctx: DecorContext, next: () => void) => {
    if (propInjectDecors.indexOf(ctx.decor) >= 0) {
        let pdrs = ctx.reflect.propProviders.get(ctx.propertyKey);
        if (!pdrs) {
            pdrs = [];
            ctx.reflect.propProviders.set(ctx.propertyKey, pdrs);
        }
        pdrs.push(ctx.metadata as PropertyMetadata);
    }
    return next();
};


export const InitCtorDesignParams = (ctx: DecorContext, next: () => void) => {
    const propertyKey = 'constructor';
    if (!ctx.reflect.methodParams.has(propertyKey)) {
        let paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.reflect.type);
        if (paramTypes) {
            const names = ctx.reflect.class.getParamNames(propertyKey);
            if (!paramTypes) {
                paramTypes = [];
            }
            ctx.reflect.methodParams.set(propertyKey, paramTypes.map((type, idx) => {
                return { type, paramName: names[idx] };
            }));
        }
    }
    return next();
}

export const typeAnnoDecors = ['@Injectable', '@Singleton', '@Abstract'];
export const TypeAnnoAction = (ctx: DecorContext, next: () => void) => {
    if (typeAnnoDecors.indexOf(ctx.decor) >= 0) {
        const reflect = ctx.reflect;
        const meta = ctx.metadata as InjectableMetadata;
        if (meta.abstract) {
            reflect.abstract = true;
        } else {
            reflect.abstract = reflect.class.annotation?.abstract === true;
        }
        if (meta.singleton) {
            reflect.singleton = true;
        }
        if (meta.provide && reflect.provides.indexOf(meta.provide) < 0) {
            reflect.provides.push(meta.provide);
        }
        if (meta.expires) {
            reflect.expires = meta.expires;
        }

        if (ctx.providers) {
            reflect.providers.push(...ctx.providers);
        }

        if (meta.regIn) {
            reflect.regIn = meta.regIn;
        }
    }
    return next();
};

export const autorunDecors = ['@Autorun', '@IocExt'];
export const AutorunAction = (ctx: DecorContext, next: () => void) => {
    if (autorunDecors.indexOf(ctx.decor) >= 0) {
        ctx.reflect.autoruns.push({
            decorType: ctx.decorType,
            autorun: (ctx.metadata as AutorunMetadata).autorun!,
            order: ctx.decorType === 'class' ? 0 : (ctx.metadata as AutorunMetadata).order
        });
        ctx.reflect.autoruns.sort((au1, au2) => au1.order! - au2.order!);
    }
    return next();
}

export const typeProvidersDecors = ['@Injectable', '@Providers'];
export const TypeProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (typeProvidersDecors.indexOf(ctx.decor) >= 0) {
        if ((ctx.metadata as ProvidersMetadata).providers) {
            ctx.reflect.providers.push(...(ctx.metadata as ProvidersMetadata).providers!);
        }
    }
    return next();
}

export const InitMethodDesignParams = (ctx: DecorContext, next: () => void) => {
    if (!ctx.reflect.methodParams.has(ctx.propertyKey)) {
        const names = ctx.reflect.class.getParamNames(ctx.propertyKey);
        ctx.reflect.methodParams.set(
            ctx.propertyKey,
            (Reflect.getMetadata('design:paramtypes', ctx.target, ctx.propertyKey) as Type[]).map((type, idx) => ({ type, paramName: names[idx] }))
        );
    }
    return next();
}

export const methodProvidersDecors = ['@Providers', '@AutoWired'];
export const MethodProvidersAction = (ctx: DecorContext, next: () => void) => {
    if (methodProvidersDecors.indexOf(ctx.decor) >= 0) {
        let pdrs = ctx.reflect.methodProviders.get(ctx.propertyKey);
        if (!pdrs) {
            pdrs = []
            ctx.reflect.methodProviders.set(ctx.propertyKey, pdrs);
        }
        const mpdrs = (ctx.metadata as ProvidersMetadata).providers;
        if (mpdrs) {
            pdrs.push(...mpdrs);
        }
    }
    return next();
}

export const ExecuteDecorHandle = (ctx: DecorContext, next: () => void) => {
    if (ctx.getHandle) {
        const handles = ctx.getHandle(ctx.decorType);
        chain(handles, ctx);
    }
    return next()
}


class DecorActions extends Actions<DecorContext, Handler | Action> {
    protected override getActionProvider(ctx: DecorContext): ActionProvider { return null!; }
    protected override parseHandler(provider: ActionProvider, ac: any): Handler {
        if (isFunction(ac)) {
            return ac;
        } else if (ac instanceof Action) {
            return ac.toHandler();
        }
        return null!;
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
    AutorunAction,
    ExecuteDecorHandle
);

methodDecorActions.use(
    InitMethodDesignParams,
    MethodProvidersAction,
    AutorunAction,
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

function dispatch(actions: Actions<DecorContext>, target: any, type: ClassType, define: DecorDefine) {
    const ctx = {
        ...define,
        target,
        reflect: get(type, true)
    };
    actions.execute(ctx, () => {
        ctx.reflect.class.addDefine(define);
    });
    cleanObj(ctx);
}

export function dispatchTypeDecor(type: ClassType, define: DecorDefine) {
    dispatch(typeDecorActions, type, type, define);
}

export function dispatchPorpDecor(type: any, define: DecorDefine) {
    dispatch(propDecorActions, type, type.constructor, define);
}

export function dispatchMethodDecor(type: any, define: DecorDefine) {
    dispatch(methodDecorActions, type, type.constructor, define);
}

export function dispatchParamDecor(type: any, define: DecorDefine) {
    let target = type;
    if (!define.propertyKey) {
        define.propertyKey = 'constructor';
    } else {
        type = type.constructor;
    }
    dispatch(paramDecorActions, target, type, define);
}

/**
 * get type reflect.
 * @param type class type.
 * @param ify if not has own reflect will create new reflect.
 */
export function get<T extends TypeReflect>(type: ClassType, ify?: boolean): T {
    let tagRefl = (type as AnnotationType).ρRfl?.() as TypeReflect;
    if (tagRefl?.type !== type) {
        if (!ify) return null!;

        let prRef = tagRefl;
        if (!prRef) {
            const parentType = getParentClass(type);
            if (parentType) {
                prRef = get(parentType, ify);
            }
        }
        tagRefl = {
            type,
            class: new TypeDefine(type, prRef?.class),
            provides: [],
            providers: [],
            autoruns: prRef ? prRef.autoruns.filter(a => a.decorType !== 'class') : [],
            propProviders: prRef ? new Map(prRef.propProviders) : new Map(),
            methodParams: prRef ? new Map(prRef.methodParams) : new Map(),
            methodProviders: prRef ? new Map(prRef.methodParams) : new Map()
        };
        (type as AnnotationType).ρRfl = () => tagRefl;
    }
    return tagRefl as T;
}

/**
 * get type class constructor parameters.
 *
 * @template T
 * @param {Type<T>} type
 * @returns {IParameter[]}
 */
export function getParameters<T>(type: Type<T>): ParameterMetadata[];
/**
 * get method parameters of type.
 *
 * @template T
 * @param {Type<T>} type
 * @param {string} propertyKey
 * @returns {IParameter[]}
 */
export function getParameters<T>(type: Type<T>, propertyKey: string): ParameterMetadata[];
export function getParameters<T>(type: Type<T>, propertyKey?: string): ParameterMetadata[] {
    propertyKey = propertyKey || 'constructor';
    return get(type)?.methodParams.get(propertyKey) || EMPTY;
}

