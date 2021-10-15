import { Abstract } from '@tsdi/ioc';


export type HeadersOption = string[][] | Record<string, string | string[] | number> | Headers | string;



@Abstract()
export abstract class Headers {
    abstract get referrer(): string;
    abstract append(name: string, value: string | string[] | number): void;
    abstract delete(name: string): void;
    abstract get(name: string): string | string[] | number;
    abstract has(name: string): boolean;
    abstract set(name: string, value: string | string[] | number): void;
    abstract forEach(callbackfn: (value: string | string[] | number, key: string, parent: Headers) => void, thisArg?: any): void;
}

