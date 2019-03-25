import { IocCoreService } from './IocCoreService';
import { ClassType, Express, Type } from '../types';
import {
    getMethodDecorators, getPropDecorators, getParamDecorators,
    getClassDecorators, getTypeMetadata, getOwnMethodMetadata, getPropertyMetadata, getParamMetadata
} from '../factories';
import { ClassMetadata, MethodMetadata, PropertyMetadata, ParameterMetadata } from '../metadatas';


export class MetadataService extends IocCoreService {

    getClassDecorators(target: ClassType<any>): string[] {
        return getClassDecorators(target);
    }

    getMethodDecorators(target: ClassType<any>): string[] {
        return getMethodDecorators(target);
        // .filter(d => actions.length ? this.hasAnyAction(d, ...actions) : this.has(d));
    }

    getPropertyDecorators(target: ClassType<any>): string[] {
        return getPropDecorators(target);
        // .filter(d => actions.length ? this.hasAnyAction(d, ...actions) : this.has(d));
    }

    getParameterDecorators(target: any, propertyKey?: string): string[] {
        return getParamDecorators(target, propertyKey);
        // .filter(d => actions.length ? this.hasAnyAction(d, ...actions) : this.has(d));
    }

    /**
     * each class metadata.
     *
     * @param {ClassType<any>} target
     * @param {((meta: ClassMetadata, decor: string) => void | boolean)} express
     * @param {Express<string, boolean>} [decorFilter]
     * @memberof DecoratorRegisterer
     */
    eachClassMetadata(target: ClassType<any>, express: (meta: ClassMetadata, decor: string) => void | boolean, decorFilter?: Express<string, boolean>) {
        let decors = this.getClassDecorators(target);
        if (decorFilter) {
            decors = decors.filter(decorFilter);
        }
        decors.some(decor => {
            let metas = getTypeMetadata<ClassMetadata>(decor, target);
            if (metas && metas.length) {
                return metas.some(meta => {
                    if (meta && express(meta, decor) === false) {
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });
    }


    /**
     * each property metadata.
     *
     * @param {ClassType<any>} target
     * @param {((meta: PropertyMetadata, propertyKey?: string, decor?: string) => void | boolean)} express
     * @param {Express<string, boolean>} [decorFilter]
     * @memberof DecoratorRegisterer
     */
    eachPropMetadata(target: ClassType<any>, express: (meta: PropertyMetadata, propertyKey?: string, decor?: string) => void | boolean, decorFilter?: Express<string, boolean>) {
        let decors = this.getClassDecorators(target);
        if (decorFilter) {
            decors = decors.filter(decorFilter);
        }
        decors.some(decor => {
            let metas = getPropertyMetadata<PropertyMetadata>(decor, target);
            if (metas) {
                return Object.keys(metas).some(key => {
                    let pMtas = metas[key];
                    if (pMtas && pMtas.length) {
                        return pMtas.some(meta => {
                            if (meta && express(meta, key, decor) === false) {
                                return true;
                            }
                            return false;
                        });
                    }
                    return false;
                })
            }
            return false;
        });
    }

    /**
     * each method metadata.
     *
     * @param {Type<any>} target
     * @param {string} propertyKey
     * @param {((meta: MethodMetadata, method: string) => void | boolean)} express
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {MethodMetadata[]}
     * @memberof DecoratorRegisterer
     */
    eachMethodMetadata(target: Type<any>, propertyKey: string, express: (meta: MethodMetadata, method: string) => void | boolean, decorFilter?: Express<string, boolean>): MethodMetadata[] {
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
                    if (meta && express(meta, decor) === false) {
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });
        return metas;
    }

    eachParamMetadata(target: any, propertyKey: string, express: (meta: ParameterMetadata, method: string) => void | boolean, decorFilter?: Express<string, boolean>): ParameterMetadata[] {
        let decors = this.getParameterDecorators(target);
        if (decorFilter) {
            decors = decors.filter(decorFilter);
        }
        let metas: ParameterMetadata[] = [];
        decors.some(decor => {
            let clmetas = getParamMetadata<ParameterMetadata>(decor, target);
            let methodmeta = clmetas[propertyKey];
            if (methodmeta && methodmeta.length) {
                return methodmeta.some(meta => {
                    if (meta && express(meta, decor) === false) {
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });
        return metas;
    }
}
