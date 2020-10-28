import { ClassType, ObjectMap } from '../types';
import { ARGUMENT_NAMES, clsUglifyExp, STRIP_COMMENTS } from '../utils/exps';
import { isFunction, lang } from '../utils/lang';


const name = '__name';
export class TypeDefine {
    className: string;
    constructor(public readonly type: ClassType, private parent?: TypeDefine) {
        this.className = lang.getDesignAnno(type)?.name || type.name;
    }

    private _extends: ClassType[];
    get extendTypes(): ClassType[] {
        if (!this._extends) {
            if (this.parent) {
                this._extends = this.parent.extendTypes.slice(0);
                this._extends.unshift(this.type);
            } else {
                this._extends = lang.getClassChain(this.type);
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
            method = '__constructor';
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
        let classAnnations = lang.getDesignAnno(ty);
        if (classAnnations && classAnnations.params) {
            anName = classAnnations.name;
            meta = {
                ...classAnnations.params,
                __constructor: classAnnations.params['constructor'],
                ...meta
            };
        }
        if (!isUglify && ty.name !== anName) {
            let descriptors = Object.getOwnPropertyDescriptors(ty.prototype);
            lang.forIn(descriptors, (item, name) => {
                if (name !== 'constructor') {
                    if (item.value) {
                        meta[name] = getParamNames(item.value)
                    }
                    if (item.set) {
                        meta[name] = getParamNames(item.set);
                    }
                }
            });
            if (!meta['__constructor'] || meta['__constructor'].length < 1) {
                meta['__constructor'] = getParamNames(ty.prototype.constructor);
            }
        }

    }

    getPropertyName(descriptor: TypedPropertyDescriptor<any>) {
        if (!descriptor) {
            return '';
        }
        return descriptor[name] ?? Object.keys(this.getPropertyDescriptors()).find(n => this.getPropertyDescriptors()[n] = descriptor);
    }

    private descriptos: ObjectMap<TypedPropertyDescriptor<any>>;
    getPropertyDescriptors(): ObjectMap<TypedPropertyDescriptor<any>> {
        if (!this.descriptos) {
            let descriptos;
            if (this.parent) {
                descriptos = { ...this.parent.getPropertyDescriptors() };
                let cdrs = Object.getOwnPropertyDescriptors(this.type.prototype);
                lang.forIn(cdrs, (d, n) => {
                    d[name] = n;
                    descriptos[n] = d;
                });
            } else {
                this.extendTypes.forEach(ty => {
                    let cdrs = Object.getOwnPropertyDescriptors(ty.prototype);
                    if (!descriptos) {
                        descriptos = cdrs;
                        descriptos = {};
                        lang.forIn(cdrs, (d, n) => {
                            d[name] = n;
                            descriptos[n] = d;
                        });
                    } else {
                        lang.forIn(cdrs, (d, n) => {
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

function getParamNames(func) {
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
