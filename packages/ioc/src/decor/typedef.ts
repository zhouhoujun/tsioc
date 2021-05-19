import { ClassType, ObjectMap } from '../types';
import { ARGUMENT_NAMES, clsUglifyExp, STRIP_COMMENTS } from '../utils/exps';
import { isArray, isFunction, isString } from '../utils/chk';
import { getClassAnnotation } from '../utils/util';
import { first, forIn, getClassChain } from '../utils/lang';
import { DecoratorType, DecorDefine, DecorMemberType } from './type';


const name = '__name';
const emptyArr = [];
const ctorBK = '__ctor';

export interface ReflectInfo {
    class: DecorDefine[];
    props: DecorDefine[];
    methods: DecorDefine[];
    params: DecorDefine[];
    propMap: Map<string, DecorDefine[]>;
    methodMap: Map<string, DecorDefine[]>;
    paramMap: Map<string, DecorDefine[]>;
}

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

    private refls: Map<string, ReflectInfo>;

    constructor(public readonly type: ClassType, private parent?: TypeDefine) {
        this.className = getClassAnnotation(type)?.name || type.name;
        this.classDecors = [];
        this.refls = new Map();
        this.decors = parent ? parent.decors.filter(d => d.decorType !== 'class') : [];
        this.propDecors = [];
        this.methodDecors = [];
        this.paramDecors = [];
        this.decors.forEach(d => this.storage(d));
    }

    protected storage(define: DecorDefine) {
        let rf = this.refls.get(define.decor);
        if (!rf) {
            rf = {
                class: [],
                methods: [],
                props: [],
                params: [],
                methodMap: new Map(),
                propMap: new Map(),
                paramMap: new Map()
            }
            this.refls.set(define.decor, rf);
        }
        switch (define.decorType) {
            case 'class':
                this.classDecors.unshift(define);
                rf.class.unshift(define);
                break;
            case 'method':
                this.methodDecors.unshift(define);
                rf.methods.unshift(define);
                this.getMapFiled(rf.methodMap, define.propertyKey).unshift(define);
                break;
            case 'property':
                this.propDecors.unshift(define);
                rf.props.unshift(define);
                this.getMapFiled(rf.propMap, define.propertyKey).unshift(define);
                break;
            case 'parameter':
                this.paramDecors.unshift(define);
                rf.params.unshift(define);
                this.getMapFiled(rf.paramMap, define.propertyKey).unshift(define);
                break;
        }
    }

    protected getMapFiled(map: Map<string, DecorDefine[]>, key: string) {
        let val = map.get(key);
        if (!isArray(val)) {
            val = [];
            map.set(key, val);
        }
        return val;
    }

    addDefine(define: DecorDefine) {
        this.storage(define);
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
        const rf = this.refls.get(decor);
        if (!rf) return false;
        switch (type) {
            case 'class':
                return rf.class.length > 0;
            case 'method':
                return propertyKey ? rf.methodMap.has(propertyKey) : rf.methods.length > 0;
            case 'property':
                return propertyKey ? rf.propMap.has(propertyKey) : rf.props.length > 0;
            case 'parameter':
                return propertyKey ? rf.paramMap.has(propertyKey) : rf.params.length > 0;
            default:
                return false;
        }
    }

    getDecorDefine<T = any>(decor: string | Function): DecorDefine<T>;
    getDecorDefine<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): DecorDefine<T>;
    getDecorDefine(decor: string | Function, type?: DecoratorType, propertyKey?: string): DecorDefine {
        type = type || 'class';
        decor = getDectorId(decor);
        const rf = this.refls.get(decor);
        if (!rf) return null;
        // const filter = propertyKey ? (d: DecorDefine) => d.decor === decor && propertyKey === d.propertyKey : (d: DecorDefine) => d.decor === decor;
        switch (type) {
            case 'class':
                return first(rf.class);
            case 'method':
                return propertyKey ? first(rf.methodMap[propertyKey]) : first(rf.methods);
            case 'property':
                return propertyKey ? first(rf.propMap[propertyKey]) : first(rf.props);
            case 'parameter':
                return propertyKey ? first(rf.paramMap[propertyKey]) : first(rf.params);
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
        const rf = this.refls.get(decor);
        if (!rf) return emptyArr;
        switch (type) {
            case 'class':
                return rf.class;
            case 'method':
                return rf.methods;
            case 'property':
                return rf.props;
            case 'parameter':
                return rf.params;
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
                this._extends = getClassChain(this.type);
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
        if (!method || method === 'constructor') {
            method = ctorBK;
        }
        return this.getParams()[method] || [];
    }

    private params: ObjectMap<string[]>;


    getParams(): ObjectMap<string[]> {
        if (!this.params) {
            let meta = {};
            if (this.parent) {
                meta = { ...this.parent.getParams() };
                this.setParam(meta, this.type);
            } else {
                this.extendTypes.forEach(ty => {
                    this.setParam(meta, ty);
                });
            }

            this.params = meta;
        }
        return this.params;
    }

    protected setParam(meta: any, ty: ClassType) {

        let isUglify = clsUglifyExp.test(ty.name);
        let anName = '';
        let classAnnations = getClassAnnotation(ty);
        if (classAnnations && classAnnations.params) {
            anName = classAnnations.name;
            meta = {
                ...classAnnations.params,
                __ctor: classAnnations.params['constructor'],
                ...meta
            };
        }
        if (!isUglify && ty.name !== anName) {
            let descriptors = Object.getOwnPropertyDescriptors(ty.prototype);
            forIn(descriptors, (item, n) => {
                if (n !== 'constructor') {
                    if (item.value) {
                        meta[n] = getParamNames(item.value)
                    }
                    if (item.set) {
                        meta[n] = getParamNames(item.set);
                    }
                }
            });
            if (!meta[ctorBK] || meta[ctorBK].length < 1) {
                meta[ctorBK] = getParamNames(ty.prototype.constructor);
            }
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
            let descriptos;
            if (this.parent) {
                descriptos = { ...this.parent.getPropertyDescriptors() };
                let cdrs = Object.getOwnPropertyDescriptors(this.type.prototype);
                forIn(cdrs, (d, n) => {
                    d[name] = n;
                    descriptos[n] = d;
                });
            } else {
                this.extendTypes.forEach(ty => {
                    let cdrs = Object.getOwnPropertyDescriptors(ty.prototype);
                    if (!descriptos) {
                        descriptos = cdrs;
                        descriptos = {};
                        forIn(cdrs, (d, n) => {
                            d[name] = n;
                            descriptos[n] = d;
                        });
                    } else {
                        forIn(cdrs, (d, n) => {
                            if (!descriptos[n]) {
                                d[name] = n;
                                descriptos[n] = d;
                            }
                        });
                    }
                });
            }
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
