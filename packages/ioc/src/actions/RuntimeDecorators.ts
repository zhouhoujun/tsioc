import { DecoratorScopes } from './DecoratorsRegisterer';
import { IRuntimeDecorators } from '../services';
import { ObjectMap } from '../types';
import { TypeDecorators } from './TypeDecorators';

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
            this._bcDecors = this.register.getRegisterer(DecoratorScopes.BeforeConstructor)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
        }
        return this._bcDecors;
    }

    private _afDecors: any[];
    get afterCstrDecors(): string[] {
        if (!this._afDecors) {
            this._afDecors = this.register.getRegisterer(DecoratorScopes.AfterConstructor)
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
            this.paramsDesc[key] = this.register.getRegisterer(DecoratorScopes.Parameter)
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
