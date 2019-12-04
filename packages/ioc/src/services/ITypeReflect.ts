import { Token, ObjectMap, ClassType } from '../types';
import { IParameter } from '../IParameter';
import { ParamProviders } from '../providers/types';
import { ClassMetadata } from '../metadatas/ClassMetadata';
import { lang } from '../utils/lang';

export interface ITypeDecoractors {
    classDecors: string[];
    propsDecors: string[];
    methodDecors: string[];
    reset();
}

export interface IDesignDecorators extends ITypeDecoractors {
    /**
     * class decorators annoationed state.
     *
     * @type {ObjectMap<boolean>}
     * @memberof ITypeReflect
     */
    classDecorState?: ObjectMap<boolean>;

    /**
     * props decorators annoationed state.
     *
     * @type {ObjectMap<boolean>}
     * @memberof RegisterActionContext
     */
    propsDecorState?: ObjectMap<boolean>;

    /**
     * method decorators annoationed state.
     *
     * @type {ObjectMap<boolean>}
     * @memberof RegisterActionContext
     */
    methodDecorState?: ObjectMap<boolean>;
}

export interface IRuntimeDecorators extends ITypeDecoractors {
    beforeCstrDecors?: string[];
    getParamDecors(propertyKey: string, target?: any): string[];
    afterCstrDecors?: string[];
}

export interface ITargetDecoractors {
    readonly design: IDesignDecorators;
    readonly runtime: IRuntimeDecorators;
    readonly classDecors: string[];
    readonly methodDecors: string[];
    readonly propsDecors: string[];
    reset();
}

export class TargetDecoractors implements ITargetDecoractors {
    constructor(public design: IDesignDecorators, public runtime: IRuntimeDecorators) {

    }

    private _clsDc;
    get classDecors() {
        if (!this._clsDc) {
            let decs = this.design.classDecors;
            this._clsDc = decs.concat(this.runtime.classDecors.filter(d => decs.indexOf(d) < 0));
        }
        return this._clsDc;
    }

    private _methodDc;
    get methodDecors() {
        if (!this._methodDc) {
            let decs = this.design.methodDecors;
            this._methodDc = decs.concat(this.runtime.methodDecors.filter(d => decs.indexOf(d) < 0));
        }
        return this._methodDc;
    }

    private _propDc;
    get propsDecors() {
        if (!this._propDc) {
            let decs = this.design.propsDecors;
            this._propDc = decs.concat(this.runtime.propsDecors.filter(d => decs.indexOf(d) < 0));
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

export class TypeDefine {
    constructor(private type: ClassType) {

    }

    private _extends: ClassType[];
    get extendTypes(): ClassType[] {
        if (!this._extends) {
            this._extends = lang.getClassChain(this.type);
        }
        return this._extends;
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
export interface ITypeReflect extends ClassMetadata {

    type: ClassType;

    /**
     * main module decorator.
     *
     * @type {string}
     * @memberof ITypeReflect
     */
    decorator?: string;

    decorators?: ITargetDecoractors;

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
     * @type {ObjectMap<ParamProviders[]>}
     * @memberof ITypeReflect
     */
    methodParamProviders: Map<string, ParamProviders[]>;
    /**
     * this class provides.
     *
     * @type {Token}
     * @memberof ITypeReflect
     */
    provides?: Token[];
}
