import { Token, ObjectMap } from '../types';
import { IParameter } from '../IParameter';
import { ParamProviders } from '../providers';
import { ClassMetadata } from '../metadatas';

export interface IDesignDecorators {
    /**
     * class decorators annoationed state.
     *
     * @type {ObjectMap<boolean>}
     * @memberof ITypeReflect
     */
    classDecors?: ObjectMap<boolean>;

    /**
     * props decorators annoationed state.
     *
     * @type {ObjectMap<boolean>}
     * @memberof RegisterActionContext
     */
    propsDecors?: ObjectMap<boolean>;

    /**
     * method decorators annoationed state.
     *
     * @type {ObjectMap<boolean>}
     * @memberof RegisterActionContext
     */
    methodDecors?: ObjectMap<boolean>;
}

export interface IRuntimeDecorators {
    classDecors: string[];
    propsDecors: string[];
    methodDecors: string[];
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
}

export class TargetDecoractors implements ITargetDecoractors {
    constructor(public design: IDesignDecorators, public runtime: IRuntimeDecorators) {

    }

    private _clsDc;
    get classDecors() {
        if (!this._clsDc) {
            let decs = Object.keys(this.design.classDecors);
            this.runtime.classDecors.forEach(d => {
                if (decs.indexOf(d) < 0) {
                    decs.push(d);
                }
            })
            this._clsDc = decs;
        }
        return this._clsDc;
    }

    private _methodDc;
    get methodDecors() {
        if (!this._methodDc) {
            let decs = Object.keys(this.design.methodDecors);
            this.runtime.methodDecors.forEach(d => {
                if (decs.indexOf(d) < 0) {
                    decs.push(d);
                }
            })
            this._methodDc = decs;
        }
        return this._methodDc;
    }

    private _propDc
    get propsDecors() {
        if (!this._propDc) {
            let decs = Object.keys(this.design.propsDecors);
            this.runtime.propsDecors.forEach(d => {
                if (decs.indexOf(d) < 0) {
                    decs.push(d);
                }
            })
            this._propDc = decs;
        }
        return this._propDc;
    }
}

/**
 * type reflect.
 *
 * @export
 * @interface ITypeReflect
 */
export interface ITypeReflect extends ClassMetadata {

    /**
     * main module decorator.
     *
     * @type {string}
     * @memberof ITypeReflect
     */
    decorator?: string;

    decorators?: ITargetDecoractors;
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
