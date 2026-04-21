import { PipeTransform } from '../pipe';
/**
 * parse bigint.
 */
export declare class BigintPipe implements PipeTransform<bigint> {
    transform(value: any): bigint;
}
