import { PipeTransform } from '../pipe';
/**
 * format bytes with unit b kb mb gb tb...
 */
export declare class BytesFormatPipe implements PipeTransform<string> {
    transform(value: any, precise?: number): string;
    protected cleanZero(num: string): string;
}
