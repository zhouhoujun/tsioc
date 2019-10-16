import { DecoratorScopes, TypeDecorators } from './DecoratorsRegisterer';
import { IRuntimeDecorators } from '../services';
import { ObjectMap } from '../types';

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
        if (!this.paramsDesc[propertyKey]) {
            this.paramsDesc[propertyKey] = this.register.getRegisterer(DecoratorScopes.Parameter)
                .getDecorators()
                .filter(d => this.reflects.hasParamerterMetadata(d, target || this.type, propertyKey))
        }
        return this.paramsDesc[propertyKey];
    }
}
