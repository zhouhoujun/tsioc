import { PipeTransform } from '../pipe';
/**
 * parse json.
 */
export declare class JsonPipe implements PipeTransform<object> {
    /**
     * @param value A value of any type to convert into a JSON-format string.
     */
    transform(value: any, length?: number): object;
}
