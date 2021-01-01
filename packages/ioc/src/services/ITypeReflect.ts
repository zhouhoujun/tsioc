import { ClassType, ObjectMap, DecoratorScope } from '../types';
import { lang } from '../utils/lang';
import { Token, ProviderType } from '../tokens';
import { IParameter } from '../IMethodAccessor';
import { IInjector } from '../IInjector';
import { InjectableMetadata } from '../decor/metadatas';



export interface ITypeDecoractors {
    readonly classDecors: string[];
    readonly propsDecors: string[];
    readonly methodDecors: string[];
    readonly beforeAnnoDecors: string[];
    readonly annoDecors: string[];
    readonly afterAnnoDecors: string[];
    getDecortors(scope: DecoratorScope): string[];
    reset();
}


export interface IRuntimeDecorators extends ITypeDecoractors {
    beforeCstrDecors?: string[];
    getParamDecors(propertyKey: string, target?: any): string[];
    afterCstrDecors?: string[];
}

export interface ITargetDecoractors {
    readonly design: ITypeDecoractors;
    readonly runtime: IRuntimeDecorators;
    readonly classDecors: string[];
    readonly methodDecors: string[];
    readonly propsDecors: string[];
    reset();
}

export class TargetDecoractors implements ITargetDecoractors {
    constructor(public readonly design: ITypeDecoractors, public readonly runtime: IRuntimeDecorators) {

    }
    private _clsDc: string[];
    get classDecors(): string[] {
        if (!this._clsDc) {
            let decs = this.design.classDecors;
            [...this.design.beforeAnnoDecors,
            ...this.design.annoDecors,
            ...this.runtime.classDecors,
            ...this.design.afterAnnoDecors].forEach(d => {
                if (decs.indexOf(d) < 0) {
                    decs.push(d);
                }
            });
            this._clsDc = decs;
        }
        return this._clsDc;
    }

    private _methodDc;
    get methodDecors() {
        if (!this._methodDc) {
            let decs = this.design.methodDecors;
            this.runtime.methodDecors.forEach(d => {
                if (decs.indexOf(d) < 0) {
                    decs.push(d);
                }
            });
            this._methodDc = decs;
        }
        return this._methodDc;
    }

    private _propDc;
    get propsDecors() {
        if (!this._propDc) {
            let decs = this.design.propsDecors;
            this.runtime.propsDecors.forEach(d => {
                if (decs.indexOf(d) < 0) {
                    decs.push(d);
                }
            });
            this._propDc = decs;
        }
        return this._propDc;
    }

    reset() {
        this._clsDc = null;
        this._methodDc = null;
        this._propDc = null;
        this.design.reset();
        this.runtime.reset();
    }
}

const name = '__name';
export class TypeDefine {
    constructor(public readonly type: ClassType, private parent?: TypeDefine) {

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

    getPropertyName(descriptor: TypedPropertyDescriptor<any>) {
        if (!descriptor) {
            return '';
        }
        let pty = descriptor[name];
        if (!pty) {
            let decs = this.getPropertyDescriptors();
            lang.forIn(decs, (dec, n) => {
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

/**
 * type reflect.
 *
 * @export
 * @interface ITypeReflect
 */
export interface ITypeReflect extends InjectableMetadata {

    type: ClassType;

    getInjector?(): IInjector;

    /**
     * main module decorator.
     *
     * @type {string}
     * @memberof ITypeReflect
     */
    decorator?: string;

    decorators: ITargetDecoractors;

    /**
     * defines.
     *
     * @type {TypeDefine}
     * @memberof ITypeReflect
     */
    readonly defines?: TypeDefine;
    /**
     * props.
     *
     * @type {PropertyMetadata[]}
     * @memberof ITypeReflect
     */
    propProviders: Map<string, Token>;
    /**
     * method params.
     *
     * @type {ObjectMap<IParameter[]>}
     * @memberof ITypeReflect
     */
    methodParams: Map<string, IParameter[]>;

    /**
     * method param providers.
     *
     * @type {ObjectMap<ProviderType[]>}
     * @memberof ITypeReflect
     */
    methodParamProviders: Map<string, ProviderType[]>;
    /**
     * this class provides.
     *
     * @type {Token}
     * @memberof ITypeReflect
     */
    provides?: Token[];
}
