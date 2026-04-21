import { PipeTransform } from './pipe';
/**
 * lowercase pipe
 */
export declare class LowerCasePipe implements PipeTransform {
    /**
     * @param value The string to transform to lower case.
     */
    transform(value: string): string;
}
/**
 * uppercase pipe.
 */
export declare class UpperCasePipe implements PipeTransform {
    /**
     * @param value The string to transform to lower case.
     */
    transform(value: string): string;
}
