import { Injectable } from '@tsdi/ioc';
import { MimeAdapter } from '../mime';

@Injectable()
export class HttpMimeAdapter extends MimeAdapter {
    charset(type: string): string {
        throw new Error('Method not implemented.');
    }
    extension(extname: string): string {
        throw new Error('Method not implemented.');
    }
    contentType(str: string): string {
        throw new Error('Method not implemented.');
    }
    lookup(path: string): string {
        throw new Error('Method not implemented.');
    }
    format(media: any): string {
        throw new Error('Method not implemented.');
    }
    parse(type: string) {
        throw new Error('Method not implemented.');
    }
    normalize(type: string): string {
        throw new Error('Method not implemented.');
    }
    match(types: string[], target: string): string {
        throw new Error('Method not implemented.');
    }

}
