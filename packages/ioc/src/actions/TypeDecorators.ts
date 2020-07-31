import { ClassType, DecoratorScope, ObjectMap } from '../types';
import { ITypeDecoractors, IRuntimeDecorators } from '../services/ITypeReflect';
import { ITypeReflects } from '../services/ITypeReflects';
import { befAnn, cls, ann, aftAnn, prop, mth, befCtor, aftCtor, parm  } from '../utils/exps';
import { DecorsRegisterer } from './IocRegAction';

/**
 * type decorators.
 *
 * @export
 * @abstract
 * @class TypeDecorators
 */
export class TypeDecorators implements ITypeDecoractors {
    constructor(protected type: ClassType, protected reflects: ITypeReflects, protected register: DecorsRegisterer) {
    }


    private _beforeAnnoDecors: any[];
    get beforeAnnoDecors(): string[] {
        if (!this._beforeAnnoDecors) {
            this._beforeAnnoDecors = this.getDecortors(befAnn);
        }
        return this._beforeAnnoDecors;
    }

    private _clsDecors: any[];
    get classDecors(): string[] {
        if (!this._clsDecors) {
            this._clsDecors = this.getDecortors(cls);
        }
        return this._clsDecors;
    }

    private _annoDecors: any[];
    get annoDecors(): string[] {
        if (!this._annoDecors) {
            this._annoDecors = this.getDecortors(ann);
        }
        return this._annoDecors;
    }


    private _afterAnnoDecors: any[];
    get afterAnnoDecors(): string[] {
        if (!this._afterAnnoDecors) {
            this._afterAnnoDecors = this.getDecortors(aftAnn);
        }
        return this._afterAnnoDecors;
    }

    private _prsDecors: any[];
    get propsDecors(): string[] {
        if (!this._prsDecors) {
            this._prsDecors = this.getDecortors(prop);
        }
        return this._prsDecors;
    }

    private _mthDecors: any[];
    get methodDecors(): string[] {
        if (!this._mthDecors) {
            this._mthDecors = this.getDecortors(mth);
        }
        return this._mthDecors;
    }

    getDecortors(scope: DecoratorScope): string[] {
        let registerer = this.register.getRegisterer(scope);
        switch (scope) {
            case befAnn:
            case cls:
            case ann:
            case aftAnn:
                return registerer.getDecorators()
                    .filter(d => this.reflects.hasMetadata(d, this.type));

            case prop:
                return registerer.getDecorators()
                    .filter(d => this.reflects.hasPropertyMetadata(d, this.type));

            case mth:
                return registerer.getDecorators()
                    .filter(d => this.reflects.hasMethodMetadata(d, this.type));

            default:
                return registerer.getDecorators();
        }
    }

    reset() {
        this._beforeAnnoDecors = null;
        this._annoDecors = null
        this._afterAnnoDecors = null;
        this._clsDecors = null;
        this._mthDecors = null;
        this._prsDecors = null;
    }
}



/**
 * runtime decorators.
 *
 * @export
 * @class RuntimeDecorators
 * @extends {TypeDecorators}
 * @implements {IRuntimeDecorators}
 */
export class RuntimeDecorators extends TypeDecorators implements IRuntimeDecorators {

    private _bcDecors: any[];
    get beforeCstrDecors(): string[] {
        if (!this._bcDecors) {
            this._bcDecors = this.register.getRegisterer(befCtor)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
        }
        return this._bcDecors;
    }

    private _afDecors: any[];
    get afterCstrDecors(): string[] {
        if (!this._afDecors) {
            this._afDecors = this.register.getRegisterer(aftCtor)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
        }
        return this._afDecors;
    }

    private paramsDesc: ObjectMap<any>;
    getParamDecors(propertyKey: string, target?: any): string[] {
        if (!this.paramsDesc) {
            this.paramsDesc = {};
        }
        let key = propertyKey === 'constructor' ? '_constructor' : propertyKey;
        if (!this.paramsDesc[key]) {
            this.paramsDesc[key] = this.register.getRegisterer(parm)
                .getDecorators()
                .filter(d => this.reflects.hasParamerterMetadata(d, target || this.type, propertyKey))
        }
        return this.paramsDesc[key];
    }

    reset() {
        super.reset();
        this._bcDecors = null;
        this._afDecors = null;
        this.paramsDesc = null;
    }
}
