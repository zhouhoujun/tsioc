import { Action, Actions } from '../action';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { StaticProvider } from '../providers';
import { ClassType, Type } from '../types';
import { chain, Handler, isArray, isClass, isFunction, isString, lang } from '../utils/lang';
import { ParameterMetadata, PropertyMetadata, ProvidersMetadata, ClassMetadata, AutorunMetadata } from './metadatas';
import { DecoratorType, DecorContext, DecorDefine, DecorMemberType, DecorPdr, TypeReflect } from './type';
import { TypeDefine } from './typedef';



export namespace refl {

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
        BeforeAnnoation?: Handler<T> | Handler<T>[];

        /**
         * decorator Class action handles.
         */
        Class?: Handler<T> | Handler<T>[];

        /**
         * decorator Parameter action handles.
         */
        Parameter?: Handler<T> | Handler<T>[];

        /**
         * decorator Property action handles.
         */
        Property?: Handler<T> | Handler<T>[];

        /**
         * decorator Method action handles.
         */
        Method?: Handler<T> | Handler<T>[];

        /**
         * decorator BeforeConstructor action handles.
         */
        BeforeConstructor?: Handler<T> | Handler<T>[];

        /**
         * decorator AfterConstructor action handles.
         */
        AfterConstructor?: Handler<T> | Handler<T>[];

        /**
         * decorator Annoation action handles.
         */
        Annoation?: Handler<T> | Handler<T>[];

        /**
         * decorator AfterAnnoation action handles.
         */
        AfterAnnoation?: Handler<T> | Handler<T>[];
    }

    /**
     * decorator register options.
     */
    export interface DecorRegisterOption {
        /**
         * decorator basic action type.
         */
        actionType?: DecorActionType | DecorActionType[];

        /**
         * decorator providers.
         */
        providers?: StaticProvider[];

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

    export interface DecorRegisteredOption extends MetadataFactory<any>, DecorPdr {
    }

    /**
     * decorator option.
     */
    export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption {

    }

    /**
     * register decorator.
     * @param decor decorator.
     * @param options options.
     */
    export function registerDecror(decor: string, options: DecoratorOption<any>): DecorRegisteredOption {
        if (options.actionType) {
            isArray(options.actionType) ?
                options.actionType.forEach(a => regActionType(decor, a))
                : regActionType(decor, options.actionType);
        }

        const option = { props: options.props, appendProps: options.appendProps } as DecorRegisteredOption;

        if (options.reflect) {
            const dechd = new Map();
            const reflect = options.reflect;
            for (let t in reflect) {
                const handle = reflect[t];
                const rged = dechd.get(t) || [];
                isArray(handle) ? rged.push(...handle) : rged.push(handle);
                dechd.set(t, rged);
            }
            option.getHandle = (type) => dechd.get(type) ?? [];
        } else {
            option.getHandle = (type) => [];
        }

        if (options.design) {
            const dsgHd = new Map();
            const design = options.design;
            for (let type in design) {
                const rged = dsgHd.get(type) || [];
                const handle = design[type];
                isArray(handle) ? rged.push(...handle) : rged.push(handle);
                dsgHd.set(type, rged);
            }
            option.getDesignHandle = (type) => dsgHd.get(type) ?? [];
        } else {
            option.getDesignHandle = (type) => [];
        }

        if (options.runtime) {
            const rtmHd = new Map();
            const runtime = options.runtime;
            for (let type in runtime) {
                const rged = rtmHd.get(type) || [];
                const handle = runtime[type];
                isArray(handle) ? rged.push(...handle) : rged.push(handle);
                rtmHd.set(type, rged);
            }
            option.getRuntimeHandle = (type) => rtmHd.get(type) ?? [];
        } else {
            option.getRuntimeHandle = (type) => [];
        }

        if (options.providers) {
            const providers = options.providers;
            option.getProvider = (inj) => {
                const state = inj.getContainer().regedState;
                if (!state.hasProvider(decor)) {
                    state.regDecoator(decor, ...providers);
                }
                return state.getProvider(decor);
            }
        } else {
            option.getProvider = (inj) => {
                return inj.getContainer().regedState.getProvider(decor);
            }
        }

        return option;
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
            let meta = ctx.matedata as ParameterMetadata;
            if (!reflect.methodParams.has(ctx.propertyKey)) {
                const names = reflect.class.getParamNames(ctx.propertyKey);
                let paramTypes: any[];
                if (ctx.propertyKey === 'constructor') {
                    paramTypes = Reflect.getMetadata('design:paramtypes', reflect.type);
                } else {
                    paramTypes = Reflect.getMetadata('design:paramtypes', ctx.target, ctx.propertyKey);
                }
                if (paramTypes) {
                    reflect.methodParams.set(ctx.propertyKey, paramTypes.map((type, idx) => {
                        return { type, paramName: names[idx] };
                    }));
                }
            }
            const params = reflect.methodParams.get(ctx.propertyKey);
            meta = { ...meta, ...params[ctx.parameterIndex] };
            params.splice(ctx.parameterIndex, 1, meta);
        }
        return next();
    };


    export const InitPropDesignAction = (ctx: DecorContext, next: () => void) => {
        const meta = ctx.matedata as PropertyMetadata;
        if (!meta.type) {
            const target = ctx.target;
            let type = Reflect.getOwnMetadata('design:type', target, ctx.propertyKey);
            if (!type) {
                // Needed to support react native inheritance
                type = Reflect.getOwnMetadata('design:type', target.constructor, ctx.propertyKey);
            }
            meta.type = type;
        }
        return next();
    }
    export const propInjectDecors = ['@Inject', '@AutoWired'];
    export const PropInjectAction = (ctx: DecorContext, next: () => void) => {
        if (propInjectDecors.indexOf(ctx.decor) >= 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as PropertyMetadata;
            if (!reflect.propProviders.has(ctx.propertyKey)) {
                reflect.propProviders.set(ctx.propertyKey, []);
            }
            const pdrs = reflect.propProviders.get(ctx.propertyKey);
            pdrs.push(meta);
        }
        return next();
    };


    export const InitCtorDesignParams = (ctx: DecorContext, next: () => void) => {
        const reflect = ctx.reflect;
        const propertyKey = 'constructor';
        if (!reflect.methodParams.has(propertyKey)) {
            let paramTypes: any[] = Reflect.getMetadata('design:paramtypes', reflect.type);
            if (paramTypes) {
                const names = reflect.class.getParamNames(propertyKey);
                if (!paramTypes) {
                    paramTypes = [];
                }
                reflect.methodParams.set(propertyKey, paramTypes.map((type, idx) => {
                    return { type, paramName: names[idx] };
                }));
            }
        }
        return next();
    }

    export const typeAnnoDecors = ['@Injectable', '@Singleton', '@Abstract', '@Refs'];
    export const TypeAnnoAction = (ctx: DecorContext, next: () => void) => {
        if (typeAnnoDecors.indexOf(ctx.decor) >= 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as ClassMetadata;
            if (meta.abstract) {
                reflect.abstract = true;
            }
            if (meta.singleton) {
                reflect.singleton = true;
            }
            if (meta.provide) {
                reflect.providers.push({ provide: meta.provide, alias: meta.alias });
            }
            if (meta.expires) {
                reflect.expires = meta.expires;
            }

            if (meta.refs) {
                reflect.refs.push(meta.refs);
            }
        }
        return next();
    };

    export const autorunDecors = ['@Autorun', '@IocExt'];
    export const AutorunAction = (ctx: DecorContext, next: () => void) => {
        if (autorunDecors.indexOf(ctx.decor) >= 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as AutorunMetadata;
            reflect.autoruns.push({
                decorType: ctx.decorType,
                autorun: meta.autorun,
                order: ctx.decorType === 'class' ? 0 : meta.order
            });
            reflect.autoruns = reflect.autoruns.sort((au1, au2) => {
                return au1.order - au2.order;
            });
        }
        return next();
    }

    export const typeProvidersDecors = ['@Injectable', '@Providers'];
    export const TypeProvidersAction = (ctx: DecorContext, next: () => void) => {
        if (typeProvidersDecors.indexOf(ctx.decor) >= 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as ProvidersMetadata;
            if (meta.providers) {
                reflect.extProviders.push(...meta.providers);
            }
        }
        return next();
    }

    export const InitMethodDesignParams = (ctx: DecorContext, next: () => void) => {
        const reflect = ctx.reflect;
        if (!reflect.methodParams.has(ctx.propertyKey)) {
            let paramTypes: any[] = Reflect.getMetadata('design:paramtypes', ctx.target, ctx.propertyKey);
            const names = reflect.class.getParamNames(ctx.propertyKey);
            reflect.methodParams.set(ctx.propertyKey, paramTypes.map((type, idx) => {
                return { type, paramName: names[idx] };
            }));
        }
        return next();
    }

    export const methodProvidersDecors = ['@Providers', '@AutoWired'];
    export const MethodProvidersAction = (ctx: DecorContext, next: () => void) => {
        if (methodProvidersDecors.indexOf(ctx.decor) >= 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as ProvidersMetadata;
            if (!reflect.methodExtProviders.has(ctx.propertyKey)) {
                reflect.methodExtProviders.set(ctx.propertyKey, []);
            }
            reflect.methodExtProviders.get(ctx.propertyKey).push(...meta.providers);
        }
        return next();
    }

    export const ExecuteDecorHandle = (ctx: DecorContext, next: () => void) => {
        if (ctx.decorPdr) {
            const handles = ctx.decorPdr.getHandle(ctx.decorType);
            chain(handles, ctx);
        }
        return next()
    }


    class DecorActions extends Actions<DecorContext> {
        protected regAction(ac: any) { }
        protected toHandle(ac: any): Handler {
            if (ac instanceof Action) {
                return ac.toAction();
            } else if (isClass(ac)) {
                const act = new ac();
                return act instanceof Action ? act.toAction() : null;
            } else if (isFunction(ac)) {
                return ac;
            }
            return null;
        }
    }

    export const typeDecorActions: Actions<DecorContext> = new DecorActions();
    export const propDecorActions: Actions<DecorContext> = new DecorActions();
    export const methodDecorActions: Actions<DecorContext> = new DecorActions();
    export const paramDecorActions: Actions<DecorContext> = new DecorActions();


    typeDecorActions
        .use(InitCtorDesignParams)
        .use(TypeAnnoAction)
        .use(TypeProvidersAction)
        .use(AutorunAction)
        .use(ExecuteDecorHandle);
    methodDecorActions
        .use(InitMethodDesignParams)
        .use(MethodProvidersAction)
        .use(AutorunAction)
        .use(ExecuteDecorHandle);
    propDecorActions
        .use(InitPropDesignAction)
        .use(PropInjectAction)
        .use(ExecuteDecorHandle);
    paramDecorActions
        .use(ParamInjectAction)
        .use(ExecuteDecorHandle);

    function dispatch(actions: Actions<DecorContext>, target: any, type: ClassType, define: DecorDefine) {
        const ctx = {
            ...define,
            target,
            reflect: getIfy(type)
        };
        actions.execute(ctx, () => {
            ctx.reflect.decors.unshift(define);
        });
        lang.cleanObj(ctx);
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

    const refFiled = '_ρreflect_';

    export function has(type: ClassType): boolean {
        return type[refFiled];
    }

    export function hasOwn(type: ClassType): boolean {
        return type[refFiled]?.()?.type === type;
    }

    export function get<T extends TypeReflect>(type: ClassType): T {
        return type[refFiled]?.() as T || null;
    }

    export function getObjRelfect<T extends TypeReflect>(target: object): T {
        return lang.getClass(target)[refFiled]?.() as T || null;
    }

    function hasMetadata(this: TypeReflect, decor: string | Function, type?: DecoratorType, propertyKey?: string): boolean {
        type = type || 'class';
        decor = getDectorId(decor);
        return this.decors.some(d => d.decor === decor && d.decorType === type && (propertyKey ? propertyKey === d.propertyKey : true));
    }

    function getDectorId(decor: string | Function): string {
        return isString(decor) ? decor : decor.toString();
    }
    function getDecorDefine(this: TypeReflect, decor: string | Function, type?: DecoratorType, propertyKey?: string): DecorDefine {
        type = type || 'class';
        decor = getDectorId(decor);
        return this.decors.find(d => d.decor === decor && d.decorType === type && (propertyKey ? propertyKey === d.propertyKey : true));
    }

    function getDecorDefines(this: TypeReflect, decor: string | Function, type?: DecoratorType): DecorDefine[] {
        decor = getDectorId(decor);
        if (!type) {
            type = 'class';
        }
        return this.decors.filter(d => d.decor === decor && d.decorType === type);
    }

    function getMetadata<T = any>(this: TypeReflect, decor: string | Function, propertyKey?: string, type?: DecorMemberType): T {
        return this.getDecorDefine(decor, propertyKey, type)?.matedata;
    }

    function getMetadatas<T = any>(this: TypeReflect, decor: string | Function, type?: DecorMemberType): T[] {
        return this.getDecorDefines(decor, type).map(d => d.matedata).filter(d => d);
    }

    export function getIfy<T extends TypeReflect>(type: ClassType, info?: T): T {
        let targetReflect: TypeReflect;
        if (!hasOwn(type)) {
            const prRef = get(type);
            targetReflect = Object.defineProperties({
                type,
                decors: prRef ? prRef.decors.filter(d => d.decorType !== 'class') : [],
                class: new TypeDefine(type, prRef?.class),
                providers: [],
                extProviders: [],
                refs: [],
                autoruns: prRef ? prRef.autoruns.filter(a => a.decorType !== 'class') : [],
                propProviders: prRef ? new Map(prRef.propProviders) : new Map(),
                methodParams: prRef ? new Map(prRef.methodParams) : new Map(),
                methodExtProviders: prRef ? new Map(prRef.methodParams) : new Map()
            }, {
                getDecorDefine: {
                    value: getDecorDefine,
                    writable: false,
                    enumerable: false
                },
                getDecorDefines: {
                    value: getDecorDefines,
                    writable: false,
                    enumerable: false
                },
                hasMetadata: {
                    value: hasMetadata,
                    writable: false,
                    enumerable: false
                },
                getMetadata: {
                    value: getMetadata,
                    writable: false,
                    enumerable: false
                },
                getMetadatas: {
                    value: getMetadatas,
                    writable: false,
                    enumerable: false
                }
            });
            type[refFiled] = () => targetReflect;
        } else {
            targetReflect = get(type);
        }
        if (info) {
            Object.assign(targetReflect, info);
        }
        return targetReflect as T;
    }

    /**
     * get type class constructor parameters.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof TypeReflects
     */
    export function getParameters<T>(type: Type<T>): ParameterMetadata[];
    /**
     * get method parameters of type.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof TypeReflects
     */
    export function getParameters<T>(type: Type<T>, propertyKey: string): ParameterMetadata[];
    export function getParameters<T>(type: Type<T>, propertyKey?: string): ParameterMetadata[] {
        propertyKey = propertyKey || 'constructor';
        return getIfy(type).methodParams.get(propertyKey) || [];
    }
}
