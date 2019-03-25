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
        if (decorType & DecoratorType.Class) {
            this.reginMap(this.classMap, decorator, ...actions);
        }
        if (decorType & DecoratorType.Property) {
            this.reginMap(this.propsMap, decorator, ...actions);
        }
        if (decorType & DecoratorType.Method) {
            this.reginMap(this.methodMap, decorator, ...actions);
        }
        if (decorType & DecoratorType.Parameter) {
            this.reginMap(this.paramMap, decorator, ...actions);
        }
    }

    has(decorator: string | Function, decorType: DecoratorType): boolean {
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
        let dec = this.getKey(decorator);
        if (map.has(dec)) {
            return map.get(dec);
        }
        return [];
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

}
