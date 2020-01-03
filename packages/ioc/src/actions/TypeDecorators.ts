import { ClassType } from '../types';
import { DecoratorsRegisterer, DecoratorScopes } from './DecoratorsRegisterer';
import { ITypeDecoractors } from '../services/ITypeReflect';
import { ITypeReflects } from '../services/ITypeReflects';

/**
 * type decorators.
 *
 * @export
 * @abstract
 * @class TypeDecorators
 */
export class TypeDecorators implements ITypeDecoractors {
    constructor(protected type: ClassType, protected reflects: ITypeReflects, protected register: DecoratorsRegisterer) {
    }


    private _beforeAnnoDecors: any[];
    get beforeAnnoDecors(): string[] {
        if (!this._beforeAnnoDecors) {
            this._beforeAnnoDecors = this.getDecortors(DecoratorScopes.BeforeAnnoation);
        }
        return this._beforeAnnoDecors;
    }

    private _clsDecors: any[];
    get classDecors(): string[] {
        if (!this._clsDecors) {
            this._clsDecors = this.getDecortors(DecoratorScopes.Class);
        }
        return this._clsDecors;
    }

    private _annoDecors: any[];
    get annoDecors(): string[] {
        if (!this._annoDecors) {
            this._annoDecors = this.getDecortors(DecoratorScopes.Annoation);
        }
        return this._annoDecors;
    }


    private _afterAnnoDecors: any[];
    get afterAnnoDecors(): string[] {
        if (!this._afterAnnoDecors) {
            this._afterAnnoDecors = this.getDecortors(DecoratorScopes.AfterAnnoation);
        }
        return this._afterAnnoDecors;
    }

    private _prsDecors: any[];
    get propsDecors(): string[] {
        if (!this._prsDecors) {
            this._prsDecors = this.getDecortors(DecoratorScopes.Property);
        }
        return this._prsDecors;
    }

    private _mthDecors: any[];
    get methodDecors(): string[] {
        if (!this._mthDecors) {
            this._mthDecors = this.getDecortors(DecoratorScopes.Method);
        }
        return this._mthDecors;
    }

    getDecortors(scope: DecoratorScopes): string[] {
        let registerer = this.register.getRegisterer(scope);
        switch (scope) {
            case DecoratorScopes.BeforeAnnoation:
            case DecoratorScopes.Class:
            case DecoratorScopes.Annoation:
            case DecoratorScopes.AfterAnnoation:
                return registerer.getDecorators()
                    .filter(d => this.reflects.hasMetadata(d, this.type));

            case DecoratorScopes.Property:
                return registerer.getDecorators()
                    .filter(d => this.reflects.hasPropertyMetadata(d, this.type));

            case DecoratorScopes.Method:
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
