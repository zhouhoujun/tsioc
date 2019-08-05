import { DataBinding } from './DataBinding';
import { observe } from './onChange';
import { isNullOrUndefined } from '@tsdi/ioc';


/**
 * assign binding
 *
 * @export
 * @class OneWayBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export abstract class ParseBinding<T> extends DataBinding<T> {

    private scope: any;
    getScope() {
        this.scope || this.source;
    }

    setScope(scope: any) {
        this.scope = scope;
    }

    abstract bind(parseTarget: any, target?: any): void;

}
export class OneWayParseBinding<T> extends ParseBinding<T> {
    bind(parseTarget: any, target?: any): void {
        let property = this.targetProp;
        let value = this.getSourceValue();
        if (isNullOrUndefined(parseTarget)) {
            return;
        }

        console.log('-------------------OneWayParseBinding----------------\n:', target, parseTarget, value)
        if (target) {
            target[property] = parseTarget;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.prop) ? this.prop.substring(0, this.prop.lastIndexOf('.')) : '');

        observe.onPropertyChange(scope, scopeFiled, (obj, prop, value, oldVal) => {
            if (obj === scope && prop === scopeFiled) {
                parseTarget[property] = value;
            }
        });

        parseTarget[property] = value;

    }
}

/**
 * assign binding
 *
 * @export
 * @class TwoWayBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export class TwoWayParseBinding<T> extends ParseBinding<T> {

    bind(parseTarget: any, target?: any): T {
        let property = this.targetProp;
        let value = this.getSourceValue();
        if (isNullOrUndefined(parseTarget)) {
            return value;
        }

        if (target) {
            target[property] = parseTarget;
        }

        let scopeFiled = this.getScopeField();
        let scope = this.getValue(this.getScope(), /\./.test(this.prop) ? this.prop.substring(0, this.prop.lastIndexOf('.')) : '');

        observe.onPropertyChange(scope, scopeFiled, (obj, prop, value, oldVal) => {
            if (obj === scope && prop === scopeFiled) {
                parseTarget[property] = value;
            }
        });

        observe.onPropertyChange(parseTarget, property, (obj, prop, value, oldVal) => {
            if (obj === parseTarget && prop === property) {
                scope[scopeFiled] = value;
            }
        });

        parseTarget[property] = value;
    }

}
