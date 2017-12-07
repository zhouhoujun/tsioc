import { Metadate } from './Metadate';
import { SymbolType } from '../../types';
import { Type } from '../../Type';
import { ProviderMetadata } from '../index';
import { ProvideMetadata } from './index';

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
