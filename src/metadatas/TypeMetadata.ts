import { Metadate } from './Metadate';
import { SymbolType } from '../types';
import { Type } from '../Type';
import { Provider } from '../index';
import { Provide } from './index';

/**
 * type metadata
 *
 * @export
 * @interface TypeMetadata
 */
export interface TypeMetadata extends Metadate {

    /**
     * property type
     *
     * @type {SymbolType<any>}
     * @memberof TypeMetadata
     */
    type?: SymbolType<any>;

    // /**
    //  * this type provider to.
    //  *
    //  * @type {Provider}
    //  * @memberof TypeMetadata
    //  */
    // provider?: Provider;

    // /**
    //  * this type provide from.
    //  *
    //  * @type {Provide}
    //  * @memberof TypeMetadata
    //  */
    // provide?: Provide;

}
