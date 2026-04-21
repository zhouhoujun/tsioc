import { PipeTransform } from '../pipe';
/**
 * parse float.
 */
export declare class FloatPipe implements PipeTransform<number> {
    transform(value: any, precision?: number): number;
}
