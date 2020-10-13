import { Action, Actions } from '../Action';
import { ClassType, Type } from '../types';
import { chain, Handler, isArray, isClass, isDefined, isFunction, lang } from '../utils/lang';
import {
    DecorDefine, ParameterMetadata, PropertyMetadata, TypeReflect, ProvidersMetadata,
    ClassMetadata, AutorunMetadata, DecorMemberType, DecoratorType
} from './metadatas';
import { TypeDefine } from './typedef';


export namespace refl {

    export type DecorActionType = 'propInject' | 'paramInject' | 'annoation' | 'autorun' | 'typeProviders' | 'methodProviders';

    export interface DecorContext extends DecorDefine {
        target: any;
        reflect: TypeReflect;
    }

    export interface DecorHanleOption {
        type: DecoratorType;
        handles?: Handler<DecorContext>[];
    }

    /**
     * decorator register options.
     */
    export interface DecorRegisterOption {
        /**
         * decorator metadata store handler.
         */
        handler?: DecorHanleOption[];
        actionType?: DecorActionType | DecorActionType[];
    }

    const decorsHandles = new Map<string, Map<DecoratorType, Handler<DecorContext>[]>>();

    export function registerDecror(decor: string, options: DecorRegisterOption) {
        if (options.actionType) {
            isArray(options.actionType) ?
                options.actionType.forEach(a => regActionType(decor, a))
                : regActionType(decor, options.actionType);
        }
        if (options.handler) {
            if (!decorsHandles.has(decor)) {
                decorsHandles.set(decor, new Map());
            }
            const dechd = decorsHandles.get(decor);
            options.handler.forEach(d => {
                if (d.handles) {
                    dechd.set(d.type, [...dechd.get(d.type) || [], ...d.handles]);
                }
            });
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
            const meta = ctx.matedata as ParameterMetadata;
            const name = reflect.class.getParamName(ctx.propertyKey, ctx.parameterIndex);
            if (!reflect.methodParams.has(ctx.propertyKey)) {
                reflect.methodParams.set(ctx.propertyKey, []);
            }
            const params = reflect.methodParams.get(ctx.propertyKey);
            const target = ctx.target;
            const propertyKey = ctx.propertyKey === 'constructor' ? undefined : ctx.propertyKey;
            let type = Reflect.getOwnMetadata('design:type', target, propertyKey);
            if (!type) {
                // Needed to support react native inheritance
                type = Reflect.getOwnMetadata('design:type', target.constructor, propertyKey);
            }
            meta.paramName = name;
            meta.type = type;
            params.unshift(meta);
        }
        return next();
    };

    export const propInjectDecors = ['@Inject', '@AutoWired'];
    export const PropInjectAction = (ctx: DecorContext, next: () => void) => {
        if (propInjectDecors.indexOf(ctx.decor) >= 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as PropertyMetadata;
            if (!reflect.propProviders.has(ctx.propertyKey)) {
                reflect.propProviders.set(ctx.propertyKey, []);
            }
            const pdrs = reflect.propProviders.get(ctx.propertyKey);
            const target = ctx.target;
            let type = Reflect.getOwnMetadata('design:type', target, ctx.propertyKey);
            if (!type) {
                // Needed to support react native inheritance
                type = Reflect.getOwnMetadata('design:type', target.constructor, ctx.propertyKey);
            }
            meta.type = type;
            pdrs.push(meta);
        }
        return next();
    };

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
        if (decorsHandles.has(ctx.decor)) {
            const handles = decorsHandles.get(ctx.decor).get(ctx.decorType);
            chain(handles, ctx);
        }
        return next()
    }


    class DecorActions extends Actions<DecorContext> {
        protected regAction(ac: any) {

        }
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
        .use(TypeAnnoAction)
        .use(TypeProvidersAction)
        .use(AutorunAction)
        .use(ExecuteDecorHandle);
    methodDecorActions
        .use(MethodProvidersAction)
        .use(AutorunAction)
        .use(ExecuteDecorHandle);
    propDecorActions
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
        }
        actions.execute(ctx, () => {
            ctx.reflect.decors.push(define);
        });
        lang.cleanObj(ctx);
    }

    export function dispatchTypeDecor(type: ClassType, define: DecorDefine) {
        console.log(type, Reflect.getMetadata('design:paramtypes', type));
        dispatch(typeDecorActions, type, type, define);
    }

    export function dispatchPorpDecor(type: any, define: DecorDefine) {
        dispatch(propDecorActions, type, type.constructor, define);
    }

    export function dispatchMethodDecor(type: any, define: DecorDefine) {
        console.log(type.constructor, Reflect.getMetadata('design:paramtypes', type, define.propertyKey))
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
        return isDefined(type[refFiled]);
    }

    // export function set(type: ClassType, typeInfo: TypeReflect) {
    //     type[refFiled] = () => typeInfo;
    // }

    export function get<T extends TypeReflect>(type: ClassType): T {
        return type[refFiled]?.() as T || null;
    }

    export function getObjRelfect<T extends TypeReflect>(target: object): T {
        return lang.getClass(target)[refFiled]?.() as T || null;
    }

    function hasMetadata(this: TypeReflect, decor: string, type?: DecoratorType): boolean {
        type = type || 'class'
        return this.decors.some(d => d.decor === decor && d.decorType === type);
    }

    function getDecorDefine(this: TypeReflect, decor: string, propertyKey?: string, type?: DecoratorType): DecorDefine {
        if (!propertyKey) {
            type = 'class';
            return this.decors.find(d => d.decor === decor && d.decorType === type);
        }
        return this.decors.find(d => d.decor === decor && d.propertyKey === propertyKey && d.decorType === type);
    }

    function getDecorDefines(this: TypeReflect, decor: string, type?: DecoratorType): DecorDefine[] {
        if (!type) {
            type = 'class';
        }
        return this.decors.filter(d => d.decor === decor && d.decorType === type);
    }

    function getMetadata<T = any>(this: TypeReflect, decor: string, propertyKey?: string, type?: DecorMemberType): T {
        return this.getDecorDefine(decor, propertyKey, type)?.matedata;
    }

    function getMetadatas<T = any>(this: TypeReflect, decor: DecorMemberType): T[] {
        return this.getDecorDefines(decor, decor).map(d => d.matedata).filter(d => d);
    }

    export function getIfy<T extends TypeReflect>(type: ClassType, info?: T): T {
        let targetReflect: TypeReflect = type[refFiled]?.();
        if (!targetReflect) {
            targetReflect = Object.defineProperties({
                type,
                decors: [],
                class: new TypeDefine(type),
                providers: [],
                extProviders: [],
                refs: [],
                autoruns: [],
                propProviders: new Map(),
                methodParams: new Map(),
                methodExtProviders: new Map()
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
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof TypeReflects
     */
    export function getParameters<T>(type: Type<T>, instance: T, propertyKey: string): ParameterMetadata[];
    export function getParameters<T>(type: Type<T>, instance?: T, propertyKey?: string): ParameterMetadata[] {
        propertyKey = propertyKey || 'constructor';
        return getIfy(type).methodParams.get(propertyKey) || [];
    }
}
