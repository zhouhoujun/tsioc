import { PipeTransform } from '../pipe';
/**
 * parse enum.
 */
export declare class EnumPipe<T> implements PipeTransform<T> {
    transform(value: any, enumType: T): T;
}
