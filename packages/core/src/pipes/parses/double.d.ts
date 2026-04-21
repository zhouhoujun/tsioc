import { PipeTransform } from '../pipe';
/**
 * parse double.
 */
export declare class DoublePipe implements PipeTransform<number> {
    transform(value: any, precision?: number): number;
}
