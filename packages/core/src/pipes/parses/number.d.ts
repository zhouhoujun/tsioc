import { PipeTransform } from '../pipe';
/**
 * parse number.
 */
export declare class NumberPipe implements PipeTransform<number> {
    transform(value: any, ...args: any[]): number;
}
