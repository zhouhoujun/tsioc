import { Token } from '../../types';
import { TypeMetadata } from './TypeMetadata';

export interface RefMetadata extends TypeMetadata {
    /**
     * define the class as service of target.
     *
     * @type {Token<any>}
     * @memberof RefMetadata
     */
    refTarget?: Token<any>;
}
