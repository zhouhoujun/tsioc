import { PipeTransform } from '../pipe';
/**
 * parse int.
 */
export declare class IntPipe implements PipeTransform<number> {
    transform(value: any, radix?: number): number;
}
