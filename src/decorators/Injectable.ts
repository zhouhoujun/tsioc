import { Type } from '../Type';
import { ClassMetadata } from './Metadata';
import { createClassDecorator, IClassDecorator } from './ClassDecoratorFactory';
import { Token } from '../types';
import { SymbolType } from '../index';


// export function provider<T>(token: Token<T>, alias?: string): InjectableMetadata {
//     return {
//         provider: token,
//         alias: alias
//     } as InjectableMetadata;
// }

/**
 * Injectable. default a
 *
 * @export
 * @interface InjectableMetadata
 */
export interface InjectableMetadata extends ClassMetadata {
    /**
     * provider for some base class
     *
     * @type {Token<any>}
     * @memberof InjectableMetadata
     */
    provider?: Token<any>;

    /**
     * alias name for injectable.
     *
     * @type {string}
     * @memberof InjectableMetadata
     */
    alias?: string;
}


/**
 * Injectable decorator and metadata. define a class.
 *
 * @Injectable
 */
export const Injectable: IClassDecorator<InjectableMetadata> = createClassDecorator<InjectableMetadata>('Injectable');

