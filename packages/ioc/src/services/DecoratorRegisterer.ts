import { IocCoreService } from './IocCoreService';
import { IocActionType } from '../actions';
import { DecoratorType } from '../factories';
import { isString } from '../utils';

/**
 * decorator register.
 *
 * @export
 * @class DecoratorRegisterer
 * @extends {IocCoreService}
 */
export class DecoratorRegisterer extends IocCoreService {
    protected classMap: Map<string, IocActionType[]>;
    protected propsMap: Map<string, IocActionType[]>;
    protected methodMap: Map<string, IocActionType[]>;
    protected paramMap: Map<string, IocActionType[]>;
    constructor() {
        super();
        this.classMap = new Map();
        this.propsMap = new Map();
        this.methodMap = new Map();
        this.paramMap = new Map();
    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...IocActionType[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, decorType: DecoratorType, ...actions: IocActionType[]) {
        this.getMaps(decorType).forEach(map => {
            this.reginMap(map, decorator, ...actions);
        })
    }

    has(decorator: string | Function, decorType: DecoratorType): boolean {
        let map = this.getDecoratorMap(decorType);
        let dec = this.getKey(decorator);
        return map && map.has(dec);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    protected reginMap(map: Map<string, IocActionType[]>, decorator: string | Function, ...actions: IocActionType[]) {
        let dec = this.getKey(decorator);
        if (map.has(dec)) {
            map.get(dec).concat(actions);
        } else {
            map.set(dec, actions);
        }
    }

    get(decorator: string | Function, decorType: DecoratorType): IocActionType[] {
        let map = this.getDecoratorMap(decorType);
        let dec = this.getKey(decorator);
        if (map.has(dec)) {
            return map.get(dec);
        }
        return [];
    }

    getDecoratorMap(decorType: DecoratorType): Map<string, IocActionType[]> {
        let map: Map<string, IocActionType[]>;
        switch (decorType) {
            case DecoratorType.Class:
                map = this.classMap;
                break;
            case DecoratorType.Method:
                map = this.methodMap;
                break;
            case DecoratorType.Property:
                map = this.propsMap;
                break;
            case DecoratorType.Parameter:
                map = this.paramMap;
                break;
        }
        return map;
    }

    protected getMaps(decorType: DecoratorType): Map<string, IocActionType[]>[] {
        let maps = [];
        if (decorType & DecoratorType.Class) {
            maps.push(this.classMap);
        }
        if (decorType & DecoratorType.Property) {
            maps.push(this.propsMap);
        }
        if (decorType & DecoratorType.Method) {
            maps.push(this.methodMap);
        }
        if (decorType & DecoratorType.Parameter) {
            maps.push(this.paramMap);
        }

        return maps;
    }

}

/**
 * design decorator register.
 *
 * @export
 * @class DesignDecoratorRegisterer
 * @extends {DecoratorRegisterer}
 */
export class DesignDecoratorRegisterer extends DecoratorRegisterer {

}

/**
 * runtiem decorator registerer.
 *
 * @export
 * @class RuntimeDecoratorRegisterer
 * @extends {DecoratorRegisterer}
 */
export class RuntimeDecoratorRegisterer extends DecoratorRegisterer {

    protected beforeConstructor: Map<string, IocActionType[]>;
    protected afterConstructor: Map<string, IocActionType[]>;

    constructor() {
        super()
        this.beforeConstructor = new Map();
        this.afterConstructor = new Map();
    }

    getDecoratorMap(decorType: DecoratorType): Map<string, IocActionType[]> {
        switch (decorType) {
            case DecoratorType.BeforeConstructor:
                return this.beforeConstructor;
            case DecoratorType.AfterConstructor:
                return this.afterConstructor;
        }
        return super.getDecoratorMap(decorType);
    }

    protected getMaps(decorType: DecoratorType): Map<string, IocActionType[]>[] {
        let maps = super.getMaps(decorType);
        if (decorType & DecoratorType.BeforeConstructor) {
            maps.push(this.beforeConstructor);
        }
        if (decorType & DecoratorType.AfterConstructor) {
            maps.push(this.afterConstructor);
        }
        return maps;
    }
}
