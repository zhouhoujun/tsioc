import { PipeTransform } from '../pipe';
/**
 * format times with unit us, ns, ms, s, min, h...
 */
export declare class TimeFormatPipe implements PipeTransform<string> {
    transform(ms: number, precise?: number): string;
    protected cleanZero(num: string): string;
}
