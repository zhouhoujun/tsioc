import { HeaderFormater } from '@tsdi/logger';
/**
 * log header formater.
 */
export declare class LogHeaderFormater extends HeaderFormater {
    format(name: string, level: string): string[];
    timestamp(time: Date): any;
}
