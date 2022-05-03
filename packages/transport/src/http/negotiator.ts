import { Injectable } from '@tsdi/ioc';
import { MimeAdapter } from '../mime';
import { Negotiator } from '../negotiator';


@Injectable()
export class HttpNegotiator extends Negotiator {
    constructor(private mime: MimeAdapter) {
        super();
    }

    charsets(...accepts: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    encodings(...accepts: string[]): string[] {
        throw new Error('Method not implemented.');
    }

    languages(...accepts: string[]): string[] {
        throw new Error('Method not implemented.');
    }
    
    mediaTypes(...accepts: string[]): string[] {
        throw new Error('Method not implemented.');
    }

}
