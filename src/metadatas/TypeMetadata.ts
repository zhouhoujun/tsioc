import { Metadate } from './Metadate';
import { SymbolType } from '../types';
import { Type } from '../Type';

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
}
