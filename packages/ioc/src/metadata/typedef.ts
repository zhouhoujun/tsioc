import { ClassType, ObjectMap } from '../types';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { isFunction, isString } from '../utils/chk';
import { getClassAnnotation } from '../utils/util';
import { forIn } from '../utils/lang';
import { DecoratorType, DecorDefine, DecorMemberType } from './type';


const name = '__name';
const emptyArr = [];


/**
 * type define.
 */
export class TypeDefine {
    className: string;

    decors: DecorDefine[];
    classDecors: DecorDefine[];
    propDecors: DecorDefine[];
    methodDecors: DecorDefine[];
    paramDecors: DecorDefine[];

    readonly annotation;
    private params: Map<string, any[]>;

    constructor(public readonly type: ClassType, private parent?: TypeDefine) {
        this.annotation = getClassAnnotation(type)
        this.className = this.annotation?.name || type.name;
        this.classDecors = [];
        if (parent) {
            this.decors = parent.decors.filter(d => d.decorType !== 'class');
            this.propDecors = parent.propDecors.slice(0);
            this.methodDecors = parent.methodDecors.slice(0);
            this.paramDecors = parent.paramDecors.slice(0);
        } else {
            this.decors = [];
            this.propDecors = [];
            this.methodDecors = [];
            this.paramDecors = [];
        }
    }

    addDefine(define: DecorDefine) {
        switch (define.decorType) {
            case 'class':
                this.classDecors.unshift(define);
                break;
            case 'method':
                this.methodDecors.unshift(define);
                break;
            case 'property':
                this.propDecors.unshift(define);
                break;
            case 'parameter':
                this.paramDecors.unshift(define);
                break;
        }
        this.decors.unshift(define);
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
        const filter = (propertyKey && type !== 'class') ? (d: DecorDefine) => d.decor === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor;
        switch (type) {
            case 'class':
                return this.classDecors.some(filter);
            case 'method':
                return this.methodDecors.some(filter);
            case 'property':
                return this.propDecors.some(filter);
            case 'parameter':
                return this.paramDecors.some(filter);
            default:
                return false;
        }
    }

    getDecorDefine<T = any>(decor: string | Function): DecorDefine<T>;
    getDecorDefine<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): DecorDefine<T>;
    getDecorDefine(decor: string | Function, type?: DecoratorType, propertyKey?: string): DecorDefine {
        type = type || 'class';
        decor = getDectorId(decor);
        const filter = (propertyKey && type !== 'class') ? (d: DecorDefine) => d.decor === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor;
        switch (type) {
            case 'class':
                return this.classDecors.find(filter);
            case 'method':
                return this.methodDecors.find(filter);
            case 'property':
                return this.propDecors.find(filter);
            case 'parameter':
                return this.paramDecors.find(filter);
            default:
                return null;
        }
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
    getDecorDefines<T = any>(decor: string | Function, type: DecorMemberType): DecorDefine<T>[];
    getDecorDefines(decor: string | Function, type?: DecoratorType): DecorDefine[] {
        decor = getDectorId(decor);
        if (!type) {
            type = 'class';
        }
        const filter = d => d.decor === decor;
        switch (type) {
            case 'class':
                return this.classDecors.filter(filter);
            case 'method':
                return this.methodDecors.filter(filter);
            case 'property':
                return this.propDecors.filter(filter);
            case 'parameter':
                return this.paramDecors.filter(filter);
            default:
                return emptyArr;
        }
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
            this.setParam(this.params);
        }
        return this.params;
    }

    protected setParam(params: Map<string, any[]>) {
        let classAnnations = this.annotation;
        if (classAnnations && classAnnations.params) {
            forIn(classAnnations.params, (p, n) => {
                params.set(n, p);
            });
        } else {
            let descriptors = Object.getOwnPropertyDescriptors(this.type.prototype);
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
