import { ClassType, ObjectMap } from '../types';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { isFunction, isString } from '../utils/chk';
import { getClassAnnotation } from '../utils/util';
import { forIn } from '../utils/lang';
import { DecoratorType, DecorDefine, DecorMemberType } from './type';


const name = '__name';


/**
 * type define.
 */
export class TypeDefine {
    className: string;

    decors: DecorDefine[];

    private params: Map<string, any[]>;

    constructor(public readonly type: ClassType, private parent?: TypeDefine) {
        this.className = getClassAnnotation(type)?.name || type.name;
        this.decors = parent ? parent.decors.filter(d => d.decorType !== 'class') : [];

    }

    addDefine(define: DecorDefine) {
        this.decors.unshift(define);
    }


    get classDecors(): DecorDefine[] {
        return this.decors.filter(d => d.decorType === 'class')
    }
    get propDecors(): DecorDefine[] {
        return this.decors.filter(d => d.decorType === 'property')
    }
    get methodDecors(): DecorDefine[] {
        return this.decors.filter(d => d.decorType === 'method')
    }
    get paramDecors(): DecorDefine[] {
        return this.decors.filter(d => d.decorType === 'parameter')
    }

    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | Function): boolean;
    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | Function, type: DecoratorType, propertyKey?: string): boolean;
    hasMetadata(decor: string | Function, type?: DecoratorType, propertyKey?: string): boolean {
        type = type || 'class';
        decor = getDectorId(decor);
        const filter = (propertyKey && type !== 'class') ? (d: DecorDefine) => d.decor === decor && d.decorType === type && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor && d.decorType === type;
        return this.decors.some(filter);
    }

    getDecorDefine<T = any>(decor: string | Function): DecorDefine<T>;
    getDecorDefine<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): DecorDefine<T>;
    getDecorDefine(decor: string | Function, type?: DecoratorType, propertyKey?: string): DecorDefine {
        type = type || 'class';
        decor = getDectorId(decor);
        const filter = (propertyKey && type !== 'class') ? (d: DecorDefine) => d.decor === decor && d.decorType === type && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor && d.decorType === type;
        return this.decors.find(filter);
    }

    /**
     * get all class decorator defines.
     * @param decor
     */
    getDecorDefines(decor: string | Function): DecorDefine[];
    /**
     * get all decorator defines.
     * @param decor decorator.
     * @param type  decorator type.
     */
    getDecorDefines<T = any>(decor: string | Function, type: DecoratorType): DecorDefine<T>[];
    getDecorDefines(decor: string | Function, type?: DecoratorType): DecorDefine[] {
        decor = getDectorId(decor);
        if (!type) {
            type = 'class';
        }
        const filter = d => d.decor === decor && d.decorType === type;
        return this.decors.filter(filter);
    }

    /**
     * get class metadata.
     * @param decor decoractor or decoractor name.
     */
    getMetadata<T = any>(decor: string | Function): T;
    /**
     * get property or method metadta.
     * @param decor decoractor or decoractor name.
     * @param propertyKey property name.
     * @param type decoractor type.
     */
    getMetadata<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): T;
    getMetadata<T = any>(decor: string | Function, propertyKey?: string, type?: DecorMemberType): T {
        return this.getDecorDefine(decor, propertyKey, type)?.metadata;
    }

    /**
     * get all metadata of class decorator.
     * @param decor the class decorator.
     */
    getMetadatas<T = any>(decor: string | Function): T[];
    /**
     * get all metadata of the decorator.
     * @param decor the decorator.
     * @param type decorator type.
     */
    getMetadatas<T = any>(decor: string | Function, type: DecorMemberType): T[];
    getMetadatas<T = any>(decor: string | Function, type?: DecorMemberType): T[] {
        return this.getDecorDefines(decor, type).map(d => d.metadata).filter(d => d);
    }

    private _extends: ClassType[];
    get extendTypes(): ClassType[] {
        if (!this._extends) {
            if (this.parent) {
                this._extends = this.parent.extendTypes.slice(0);
                this._extends.unshift(this.type);
            } else {
                this._extends = [this.type];
            }
        }
        return this._extends;
    }

    getParamName(method: string, idx: number): string {
        const names = this.getParamNames(method);
        if (idx >= 0 && names.length > idx) {
            return names[idx];
        }
        return '';
    }

    getParamNames(method: string): string[] {
        const prop = method ?? 'constructor';
        return this.getParams().get(prop) || [];
    }

    getParams(): Map<string, any[]> {
        if (!this.params) {
            this.params = this.parent ? new Map(this.parent.getParams()) : new Map();
            this.setParam(this.params, this.type);
        }
        return this.params;
    }

    protected setParam(params: Map<string, any[]>, ty: ClassType) {
        let classAnnations = getClassAnnotation(ty);
        if (classAnnations && classAnnations.params) {
            forIn(classAnnations.params, (p, n) => {
                params.set(n, p);
            });
        } else {
            let descriptors = Object.getOwnPropertyDescriptors(ty.prototype);
            forIn(descriptors, (item, n) => {
                if (item.value) {
                    params.set(n, getParamNames(item.value));
                }
                if (item.set) {
                    params.set(n, getParamNames(item.value));
                }
            });
        }
    }

    getPropertyName(descriptor: TypedPropertyDescriptor<any>) {
        if (!descriptor) {
            return '';
        }
        let pty = descriptor[name];
        if (!pty) {
            let decs = this.getPropertyDescriptors();
            forIn(decs, (dec, n) => {
                if (dec === descriptor) {
                    pty = n;
                    return false;
                }
            });
        }
        return pty;
    }

    private descriptos: ObjectMap<TypedPropertyDescriptor<any>>;
    getPropertyDescriptors(): ObjectMap<TypedPropertyDescriptor<any>> {
        if (!this.descriptos) {
            const descriptos = this.parent ? { ...this.parent.getPropertyDescriptors() } : {};
            forIn(Object.getOwnPropertyDescriptors(this.type.prototype), (d, n) => {
                d[name] = n;
                descriptos[n] = d;
            });
            this.descriptos = descriptos;
        }
        return this.descriptos;
    }

    isExtends(type: ClassType): boolean {
        return this.extendTypes.indexOf(type) >= 0;
    }
}

function getParamNames(func: Function) {
    if (!isFunction(func)) {
        return [];
    }
    let fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
        result = [];
    }
    return result;
}

function getDectorId(decor: string | Function): string {
    return isString(decor) ? decor : decor.toString();
}
