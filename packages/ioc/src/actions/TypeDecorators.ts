import { ClassType, DecoratorScope } from '../types';
import { DecorsRegisterer } from './DecorsRegisterer';
import { ITypeDecoractors } from '../services/ITypeReflect';
import { ITypeReflects } from '../services/ITypeReflects';
import { befAnn, cls, ann, aftAnn, ptr, mth } from '../utils/exps';


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
            this._prsDecors = this.getDecortors(ptr);
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

            case ptr:
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
