import { IocCoreService } from './IocCoreService';
import { IocActionType } from '../actions';
import { ClassType, Express, Type } from '../types';
import {
    getMethodDecorators, getPropDecorators, getParamDecorators,
    getClassDecorators, getTypeMetadata, getOwnMethodMetadata
} from '../factories';
import { isString } from '../utils';
import { ClassMetadata, MethodMetadata } from '../metadatas';

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

    eachMethodMetadata(target: Type<any>, propertyKey: string, express: Express<MethodMetadata, void | boolean>, decorFilter?: Express<string, boolean>): MethodMetadata[] {
        let decors = this.getMethodDecorators(target);
        if (decorFilter) {
            decors = decors.filter(decorFilter);
        }
        let metas: MethodMetadata[] = [];
        decors.some(decor => {
            let clmetas = getOwnMethodMetadata<MethodMetadata>(decor, target);
            let methodmeta = clmetas[propertyKey];
            if (methodmeta && methodmeta.length) {
                return methodmeta.some(meta => {
                    if (meta && express(meta) === false) {
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });
        return metas;
    }

    filterMethodMetadata(target: Type<any>, propertyKey: string, filter?: Express<MethodMetadata, boolean>, decorFilter?: Express<string, boolean>): MethodMetadata[] {
        let metadatas: MethodMetadata[] = [];
        this.eachMethodMetadata(target, propertyKey, meta => {
            if (!filter) {
                metadatas.push(meta);
            } else if (filter(meta)) {
                metadatas.push(meta);
            }
        }, decorFilter)
        return metadatas;
    }

    findMethodMetadata(target: Type<any>, propertyKey: string, filter: Express<MethodMetadata, boolean>, decorFilter?: Express<string, boolean>): MethodMetadata {
        let metadata: MethodMetadata;
        this.eachMethodMetadata(target, propertyKey, meta => {
            if (filter(meta)) {
                metadata = meta;
                return false;
            }
            return true;
        }, decorFilter)
        return metadata;
    }

    eachClassMetadata(target: ClassType<any>, express: Express<ClassMetadata, void | boolean>, decorFilter?: Express<string, boolean>) {
        let decors = this.getClassDecorators(target);
        if (decorFilter) {
            decors = decors.filter(decorFilter);
        }
        decors.some(decor => {
            let metas = getTypeMetadata<ClassMetadata>(decor, target);
            if (metas && metas.length) {
                return metas.some(meta => {
                    if (meta && express(meta) === false) {
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });
    }

    filterClassMetadata(target: ClassType<any>, filter?: Express<ClassMetadata, boolean>, decorFilter?: Express<string, boolean>): ClassMetadata[] {
        let metadatas: ClassMetadata[] = [];
        this.eachClassMetadata(target, meta => {
            if (!filter) {
                metadatas.push(meta);
            } else if (filter(meta)) {
                metadatas.push(meta);
            }
        }, decorFilter)
        return metadatas;
    }

    findClassMetadata(target: ClassType<any>, filter: Express<ClassMetadata, boolean>, decorFilter?: Express<string, boolean>): ClassMetadata {
        let metadata: ClassMetadata;
        this.eachClassMetadata(target, meta => {
            if (filter(meta)) {
                metadata = meta;
                return false;
            }
            return true;
        }, decorFilter)
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
