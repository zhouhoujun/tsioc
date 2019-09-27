import { DecoratorScopes, DesignDecoratorRegisterer } from './DecoratorRegisterer';
import { TypeReflects, IDesignRegistState } from '../services';
import { ClassType, ObjectMap } from '../types';


export class DesignDecorators implements IDesignRegistState {
    constructor(private type: ClassType, private reflects: TypeReflects, private register: DesignDecoratorRegisterer) {

    }

    private _clsDecors: any;
    get classDecors(): ObjectMap<boolean> {
        if (!this._clsDecors) {
            this._clsDecors = this.register.getRegisterer(DecoratorScopes.Class)
                .getDecorators()
                .filter(d => this.reflects.hasMetadata(d, this.type))
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return this._clsDecors;
    }

    private _prsDecors: any;
    get propsDecors(): ObjectMap<boolean> {
        if (!this._prsDecors) {
            this._prsDecors = this.register
                .getRegisterer(DecoratorScopes.Property)
                .getDecorators()
                .filter(d => this.reflects.hasPropertyMetadata(d, this.type))
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return this._prsDecors;
    }

    private _mthDecors: any;
    get methodDecors(): ObjectMap<boolean> {
        if (!this._mthDecors) {
            this._mthDecors = this.register
                .getRegisterer(DecoratorScopes.Method)
                .getDecorators()
                .filter(d => this.reflects.hasMethodMetadata(d, this.type))
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return this._mthDecors;
    }
}
