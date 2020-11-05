import { Action, Actions } from '../Action';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { ClassType, DecoratorScope, Type } from '../types';
import { chain, Handler, isArray, isClass, isFunction, isString, lang } from '../utils/lang';
import {
    DecorDefine, ParameterMetadata, PropertyMetadata, TypeReflect, ProvidersMetadata,
    ClassMetadata, AutorunMetadata, DecorMemberType, DecoratorType
} from './metadatas';
import { TypeDefine } from './typedef';



export namespace refl {

    export type DecorActionType = 'propInject' | 'paramInject' | 'annoation' | 'autorun' | 'typeProviders' | 'methodProviders';

    export interface HandleMap {
        getHandle(type: DecoratorType): Handler<DecorContext>[];
        getRuntimeHandle(type: DecoratorScope): Handler<RuntimeContext>[];
        getDesignHandle(type: DecoratorScope): Handler<DesignContext>[];
    }

    export interface DecorContext extends DecorDefine {
        target: any;
        reflect: TypeReflect;
        handler: HandleMap;
    }

    interface DecorHanleOption {
        type: DecoratorType;
        handle?: Handler<DecorContext> | Handler<DecorContext>[];
    }

    export interface DecorScopeHandles<T> {
        type: DecoratorScope;
        handle?: Handler<T> | Handler<T>[];
    }

    /**
     * decorator register options.
     */
    export interface DecorRegisterOption {
        /**
         * class handlers
         */
        classHandle?: Handler<DecorContext> | Handler<DecorContext>[];
        /**
         * property handlers
         */
        propHandle?: Handler<DecorContext> | Handler<DecorContext>[];
        /**
         * method handlers
         */
        methodHandle?: Handler<DecorContext> | Handler<DecorContext>[];
        /**
         * parameter handlers
         */
        paramHandle?: Handler<DecorContext> | Handler<DecorContext>[];
        /**
         * decorator action type.
         */
        actionType?: DecorActionType | DecorActionType[];

        /**
         * design handles.
         */
        designHandles?: DecorScopeHandles<DesignContext> | DecorScopeHandles<DesignContext>[];
        /**
         * runtime handles.
         */
        runtimeHandles?: DecorScopeHandles<RuntimeContext> | DecorScopeHandles<RuntimeContext>[];
    }

    export interface DecorRegisteredOption extends DecorRegisterOption, HandleMap {
    }

    /**
     * decorator option.
     */
    export interface DecoratorOption<T> extends DecorRegisterOption {
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
     * register decorator.
     * @param decor decorator.
     * @param options options.
     */
    export function registerDecror(decor: string, option: DecorRegisterOption) {
        const options = option as DecorRegisteredOption;
        if (options.actionType) {
            isArray(options.actionType) ?
                options.actionType.forEach(a => regActionType(decor, a))
                : regActionType(decor, options.actionType);
        }

        const hanldes: DecorHanleOption[] = [];
        if (options.classHandle) {
            hanldes.push({ type: 'class', handle: options.classHandle })
        }
        if (options.propHandle) {
            hanldes.push({ type: 'property', handle: options.propHandle })
        }
        if (options.methodHandle) {
            hanldes.push({ type: 'method', handle: options.methodHandle })
        }
        if (options.paramHandle) {
            hanldes.push({ type: 'parameter', handle: options.paramHandle })
        }

        if (hanldes.length) {
            const dechd = new Map();
            hanldes.forEach(d => {
                const rged = dechd.get(d.type) || [];
                isArray(d.handle) ? rged.push(...d.handle) : rged.push(d.handle);
                dechd.set(d.type, rged);
            });
            options.getHandle = (type) => dechd.get(type);
        } else {
            options.getHandle = (type) => [];
        }

        if (options.designHandles) {
            const dsgHd = new Map();
            (Array.isArray(options.designHandles) ? options.designHandles : [options.designHandles]).forEach(ds => {
                const rged = dsgHd.get(ds.type) || [];
                isArray(ds.handle) ? rged.push(...ds.handle) : rged.push(ds.handle);
            });
            options.getDesignHandle = (type) => dsgHd.get(type);
        } else {
            options.getDesignHandle = (type) => [];
        }

        if (options.runtimeHandles) {
            const rtmHd = new Map();
            (Array.isArray(options.runtimeHandles) ? options.runtimeHandles : [options.runtimeHandles]).forEach(ds => {
                const rged = rtmHd.get(ds.type) || [];
                isArray(ds.handle) ? rged.push(...ds.handle) : rged.push(ds.handle);
            });
            options.getRuntimeHandle = (type) => rtmHd.get(type);
        } else {
            options.getRuntimeHandle = (type) => [];
        }
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
        ctx.handler.getHandle
        if (ctx.handler) {
            const handles = ctx.handler.getHandle(ctx.decorType);
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

    function dispatch(actions: Actions<DecorContext>, target: any, type: ClassType, define: DecorDefine, options: DecoratorOption<any>) {
        const ctx = {
            ...define,
            target,
            handler: options as HandleMap,
            reflect: getIfy(type)
        };
        actions.execute(ctx, () => {
            ctx.reflect.decors.unshift(define);
        });
        lang.cleanObj(ctx);
    }

    export function dispatchTypeDecor(type: ClassType, define: DecorDefine, options: DecoratorOption<any>) {
        dispatch(typeDecorActions, type, type, define, options);
    }

    export function dispatchPorpDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
        dispatch(propDecorActions, type, type.constructor, define, options);
    }

    export function dispatchMethodDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
        dispatch(methodDecorActions, type, type.constructor, define, options);
    }

    export function dispatchParamDecor(type: any, define: DecorDefine, options: DecoratorOption<any>) {
        let target = type;
        if (!define.propertyKey) {
            define.propertyKey = 'constructor';
        } else {
            type = type.constructor;
        }
        dispatch(paramDecorActions, target, type, define, options);
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
