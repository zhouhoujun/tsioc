import { AbstractType } from '@tsdi/ioc';
import { PipeTransform } from '../pipe';
/**
 * parse long.
 */
export declare class ArrayPipe implements PipeTransform<Array<any>> {
    transform<T>(value: any, type?: AbstractType<T> | 'string' | 'int' | 'float' | 'number' | 'bigint', length?: number): Array<T>;
    private parseType;
}
