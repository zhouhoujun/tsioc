import { IocCoreService } from './IocCoreService';
import { IocActionType } from '../actions';
import { ClassType, Express } from '../types';
import {
    getMethodDecorators, getPropDecorators,
    getParamDecorators, getClassDecorators, getTypeMetadata
} from '../factories';
import { isString } from '../utils';
import { ClassMetadata } from '../metadatas';

/**
 * decorator register.
 *
 * @export
 * @class DecoratorRegisterer
 * @extends {IocCoreService}
 */
export class DecoratorRegisterer extends IocCoreService {
    protected map: Map<string, IocActionType[]>;
    constructor() {
        super();
        this.map = new Map();
    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...IocActionType[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, ...actions: IocActionType[]) {
        let dec = this.getKey(decorator);
        if (this.map.has(dec)) {
            this.map.get(dec).concat(actions);
        } else {
            this.map.set(dec, actions);
        }
    }

    get(decorator: string | Function): IocActionType[] {
        let dec = this.getKey(decorator);
        if (this.map.has(dec)) {
            return this.map.get(dec);
        }
        return [];
    }

    getClassDecorators(target: ClassType<any>, ...actions: IocActionType[]): string[] {
        return getClassDecorators(target)
            .filter(d => actions.length ? this.hasAnyAction(d, ...actions) : this.has(d));
    }

    getMethodDecorators(target: ClassType<any>, ...actions: IocActionType[]): string[] {
        return getMethodDecorators(target)
            .filter(d => actions.length ? this.hasAnyAction(d, ...actions) : this.has(d));
    }

    getPropertyDecorators(target: ClassType<any>, ...actions: IocActionType[]): string[] {
        return getPropDecorators(target)
            .filter(d => actions.length ? this.hasAnyAction(d, ...actions) : this.has(d));
    }

    getParameterDecorators(target: any, propertyKey?: string, ...actions: IocActionType[]): string[] {
        return getParamDecorators(target, propertyKey)
            .filter(d => actions.length ? this.hasAnyAction(d, ...actions) : this.has(d));
    }

    findClassMetadata(target: ClassType<any>, filter: Express<ClassMetadata, boolean>, decorFilter?: Express<string, boolean>): ClassMetadata {
        let metadata: ClassMetadata;
        let decors = this.getClassDecorators(target);
        if (decorFilter) {
            decors = decors.filter(decorFilter);
        }
        decors.some(decor => {
            let metas = getTypeMetadata<ClassMetadata>(decor, target);
            if (metas && metas.length) {
                return metas.some(meta => {
                    if (meta && filter(meta)) {
                        metadata = meta;
                    }
                    return !!metadata;
                });
            }
            return false;
        });
        return metadata;
    }

    has(decorator: string | Function): boolean {
        let dec = this.getKey(decorator);
        return this.map.has(dec);
    }

    /**
     * has any action or not.
     *
     * @param {(string | Function)} decorator
     * @param {...IocActionType[]} actions
     * @returns {boolean}
     * @memberof DecoratorRegisterer
     */
    hasAnyAction(decorator: string | Function, ...actions: IocActionType[]): boolean {
        let dec = this.getKey(decorator);
        return this.map.has(dec) && this.map.get(dec).some(a => actions.indexOf(a) >= 0);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

}
