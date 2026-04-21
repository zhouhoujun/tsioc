import { PipeTransform } from '../pipe';
/**
 * parse string.
 */
export declare class StringPipe implements PipeTransform<string> {
    transform(value: any, length?: number): string;
}
