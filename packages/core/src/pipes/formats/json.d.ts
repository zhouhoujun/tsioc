import { PipeTransform } from '../pipe';
/**
 * json stringify.
 */
export declare class JsonFormatPipe implements PipeTransform {
    /**
     * @param value A value of any type to convert into a JSON-format string.
     */
    transform(value: any): string;
}
