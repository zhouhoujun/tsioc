import { PipeTransform } from '../pipe';
/**
 * parse boolean.
 */
export declare class BoolPipe implements PipeTransform<boolean> {
    transform(value: any, ...args: any[]): boolean;
}
