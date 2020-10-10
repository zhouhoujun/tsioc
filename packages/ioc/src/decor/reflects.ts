import { Action, Actions } from '../Action';
import { ClassType, Type } from '../types';
import { Handler, isDefined, isFunction, lang } from '../utils/lang';
import { DecorDefine, ParameterMetadata, PropertyMetadata, TypeReflect, RefMetadata, ClassMetadata } from './metadatas';
import { TypeDefine } from './typedef';


export namespace refl {

    export interface DecorContext extends DecorDefine {
        reflect: TypeReflect;
    }

    export const injectParamDecors = ['@Inject', '@AutoWired', '@Param'];
    export const InjectParamAction = (ctx: DecorContext, next: () => void) => {
        if (injectParamDecors.indexOf(ctx.decor) > 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as ParameterMetadata;
            const name = reflect.class.getParamName(ctx.propertyKey, ctx.parameterIndex);
            if (!reflect.methodParams.has(ctx.propertyKey)) {
                reflect.methodParams.set(ctx.propertyKey, []);
            }
            const params = reflect.methodParams.get(ctx.propertyKey);
            let type = Reflect.getOwnMetadata('design:type', reflect.class.type, ctx.propertyKey);
            if (!type) {
                // Needed to support react native inheritance
                type = Reflect.getOwnMetadata('design:type', reflect.class.type.constructor, ctx.propertyKey);
            }
            meta.paramName = name;
            meta.type = type;
            params.push(meta);
        }
        return next();
    };

    export const injectPropDecors = ['@Inject', '@AutoWired'];
    export const InjectPropAction = (ctx: DecorContext, next: () => void) => {
        if (injectPropDecors.indexOf(ctx.decor) > 0) {
            const reflect = ctx.reflect;
            const meta = ctx.matedata as PropertyMetadata;
            if (!reflect.propProviders.has(ctx.propertyKey)) {
                reflect.propProviders.set(ctx.propertyKey, []);
            }
            const pdrs = reflect.propProviders.get(ctx.propertyKey);
            let type = Reflect.getOwnMetadata('design:type', reflect.class.type, ctx.propertyKey);
            if (!type) {
                // Needed to support react native inheritance
                type = Reflect.getOwnMetadata('design:type', reflect.class.type.constructor, ctx.propertyKey);
            }
            meta.type = type;
            pdrs.push(meta);
        }
        return next();
    };

    export const classAnnoDecors = ['@Injectable', '@Singleton', '@Abstract', '@Refs', '@Providers'];
    export const ClassAnnoAction = (ctx: DecorContext, next: () => void) => {
        if (classAnnoDecors.indexOf(ctx.decor) > 0) {
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
            if (meta.providers) {
                reflect.extProviders.push(...meta.providers);
            }
            if (meta.refs) {
                reflect.refs.push(meta.refs);
            }
        }
        return next();
    };


    class DecorActions extends Actions<DecorContext> {
        protected regAction(ac: any) {

        }
        protected toHandle(ac: any): Handler {
            if (ac instanceof Action) {
                return ac.toAction();
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


    typeDecorActions.use(ClassAnnoAction);
    propDecorActions.use(InjectPropAction);
    paramDecorActions.use(InjectParamAction);

    function dispatch(actions: Actions<DecorContext>, type: ClassType, define: DecorDefine) {
        const ctx = {
            ...define,
            reflect: getIfy(type)
        }
        actions.execute(ctx, () => {
            ctx.reflect.decors.push(define);
        });
        lang.cleanObj(ctx);
    }

    export function dispatchTypeDecor(type: ClassType, define: DecorDefine) {
        dispatch(typeDecorActions, type, define);
    }

    export function dispatchPorpDecor(type: ClassType, define: DecorDefine) {
        dispatch(propDecorActions, type, define);
    }

    export function dispatchMethodDecor(type: ClassType, define: DecorDefine) {
        dispatch(methodDecorActions, type, define);
    }

    export function dispatchParamDecor(type: ClassType, define: DecorDefine) {
        dispatch(paramDecorActions, type, define);
    }

    const refFiled = 'ρ_reflect_';

    export function has(type: ClassType): boolean {
        return isDefined(type[refFiled]);
    }

    export function set(type: ClassType, typeInfo: TypeReflect) {
        type[refFiled] = typeInfo;
    }

    export function get<T extends TypeReflect>(type: ClassType): T {
        return type[refFiled] as T || null;
    }

    export function getObjRelfect<T extends TypeReflect>(target: object): T {
        return lang.getClass(target)[refFiled] as T || null;
    }

    export function getIfy<T extends TypeReflect>(type: ClassType, info?: T): T {
        let targetReflect: TypeReflect = type[refFiled];
        if (!targetReflect) {
            targetReflect = {
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
            };
            type[refFiled] = targetReflect;
        }
        if (info) {
            targetReflect = Object.assign(targetReflect, info);
            type[refFiled] = targetReflect;
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
