import { ClassType } from '../types';
import { DecoratorsRegisterer, DecoratorScopes } from './DecoratorsRegisterer';
import { ITypeReflects } from '../services/ITypeReflects';

/**
 * type decorators.
 *
 * @export
 * @abstract
 * @class TypeDecorators
 */
export abstract class TypeDecorators {
    constructor(protected type: ClassType, protected reflects: ITypeReflects, protected register: DecoratorsRegisterer) {
    }

    private _clsDecors: any[];
    get classDecors(): string[] {
        if (!this._clsDecors) {
            this._clsDecors = this.register.getRegisterer(DecoratorScopes.Class)
                .getDecorators()
                .filter(d => this.reflects.hasMetadata(d, this.type));
        }
        return this._clsDecors;
    }

    private _prsDecors: any[];
    get propsDecors(): string[] {
        if (!this._prsDecors) {
            this._prsDecors = this.register.getRegisterer(DecoratorScopes.Property)
                .getDecorators()
                .filter(d => this.reflects.hasPropertyMetadata(d, this.type));
        }
        return this._prsDecors;
    }

    private _mthDecors: any[];
    get methodDecors(): string[] {
        if (!this._mthDecors) {
            this._mthDecors = this.register.getRegisterer(DecoratorScopes.Method)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type));
        }
        return this._mthDecors;
    }

    reset() {
        this._clsDecors = null;
        this._mthDecors = null;
        this._prsDecors = null;
    }
}
