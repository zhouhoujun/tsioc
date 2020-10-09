import { Action, Actions } from '../Action';
import { ClassType, ObjectMap } from '../types';
import { Handler, isFunction } from '../utils/lang';
import { DecorContext } from './actions';
import { TypeReflect } from './metadatas';
import { TypeDefine } from './typedef';

export type DecorActionType =  'inject' | 'annation' | 'autorun'

export namespace reflects {

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

    export const decorDefine = new Map<string, ObjectMap<boolean>>();

    export function isDecorActionType(decor: string, type: DecorActionType): boolean {
        return decorDefine.get(decor)?.[type] === true;
    }

    export const typeDecorActions: Actions<DecorContext> = new DecorActions();
    export const propDecorActions: Actions<DecorContext> = new DecorActions();
    export const paramDecorActions: Actions<DecorContext> = new DecorActions();


    const reflmap = new Map<ClassType, TypeReflect>();
    export function has(type: ClassType): boolean {
        return reflmap.has(type);
    }

    export function set(type: ClassType, typeInfo: TypeReflect) {
        reflmap.set(type, typeInfo);
    }

    export function get<T extends TypeReflect>(type: ClassType): T {
        return reflmap.get(type) as T || null;
    }

    export function getIfy<T extends TypeReflect>(type: ClassType, info?: T): T {
        let targetReflect: TypeReflect;
        let exists = reflmap.has(type);
        if (exists) {
            targetReflect = reflmap.get(type);
        } else {
            targetReflect = {
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
        }
        if (info) {
            targetReflect = Object.assign(targetReflect, info);
        }
        if (!exists || info) {
            reflmap.set(type, targetReflect);
        }
        return targetReflect as T;
    }
}
