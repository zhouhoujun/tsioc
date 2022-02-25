import { Pattern, TransportRequest } from '../packet';


export class HttpRequest<T= any> implements TransportRequest {
    readonly pattern: Pattern;
    constructor(pattern: Pattern) {
        this.pattern = pattern;
    } 

    headers?: Record<string, string | number | string[]> | undefined;
    body?: T;

    

}