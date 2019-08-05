import { OneWayBinding } from './OneWayBinding';
import { TwoWayBinding } from './TwoWayBinding';


/**
 * assign binding
 *
 * @export
 * @class OneWayBinding
 * @extends {DataBinding<T>}
 * @template T
 */
export class ParseBinding<T> extends OneWayBinding<T> {

    constructor(source: any, propName: string) {
        super(source, propName)
    }
    private scope: any;
    getScope() {
        this.scope || this.source;
    }

    setScope(scope: any) {
        this.scope = scope;
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
export class TwoWayParseBinding<T> extends TwoWayBinding<T> {

    constructor(source: any, propName: string) {
        super(source, propName)
    }
    private scope: any;
    getScope() {
        this.scope || this.source;
    }

    setScope(scope: any) {
        this.scope = scope;
    }

}
