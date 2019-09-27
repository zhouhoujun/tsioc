import { DecoratorScopes, RuntimeDecoratorRegisterer } from './DecoratorRegisterer';
import { IRuntimeDecorators, TypeReflects } from '../services';
import { ClassType, ObjectMap } from '../types';


export class RuntimeDecorators implements IRuntimeDecorators {
    constructor(private type: ClassType, private reflects: TypeReflects, private register: RuntimeDecoratorRegisterer) {
        this.paramsDesc = {};
    }

    private _clsDecors: any[];
    get classDecors(): string[] {
        if (!this._clsDecors) {
            this._clsDecors = this.register.getRegisterer(DecoratorScopes.Class)
                .getDecorators()
                .filter(d => this.reflects.hasMetadata(d, this.type))
        }
        return this._clsDecors;
    }

    private _prsDecors: any[];
    get propsDecors(): string[] {
        if (!this._prsDecors) {
            this._prsDecors = this.register
                .getRegisterer(DecoratorScopes.Property)
                .getDecorators()
                .filter(d => this.reflects.hasPropertyMetadata(d, this.type))
        }
        return this._prsDecors;
    }

    private _mthDecors: any[];
    get methodDecors(): string[] {
        if (!this._mthDecors) {
            this._mthDecors = this.register
                .getRegisterer(DecoratorScopes.Method)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
        }
        return this._mthDecors;
    }
    private _bcDecors: any[];
    get beforeCstrDecors(): string[] {
        if (!this._bcDecors) {
            this._bcDecors = this.register
                .getRegisterer(DecoratorScopes.BeforeConstructor)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
        }
        return this._bcDecors;
    }

    private _afDecors: any[];
    get afterCstrDecors(): string[] {
        if (!this._afDecors) {
            this._afDecors = this.register
                .getRegisterer(DecoratorScopes.AfterConstructor)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
        }
        return this._afDecors;
    }

    private paramsDesc: ObjectMap<any>;
    getParamDecors(propertyKey: string, target?: any): string[] {
        if (!this.paramsDesc[propertyKey]) {
            this.paramsDesc[propertyKey] = this.register.getRegisterer(DecoratorScopes.Parameter)
                .getDecorators()
                .filter(d => this.reflects.hasParamerterMetadata(d, target || this.type, propertyKey))
        }
        return this.paramsDesc[propertyKey];
    }
}
