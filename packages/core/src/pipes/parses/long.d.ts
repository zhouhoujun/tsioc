import { PipeTransform } from '../pipe';
/**
 * parse long.
 */
export declare class LongPipe implements PipeTransform<number | bigint> {
    transform(value: any, radix?: number): number | bigint;
}
