import { Middleware, TransportContext } from '@tsdi/core';
import { Abstract, Injectable, Nullable } from '@tsdi/ioc';

/**
 * static content resources.
 */
@Injectable()
export class ContentMiddleware implements Middleware {

    constructor(@Nullable() private options: ContentOptions) {

    }

    invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void> {
        throw new Error('Method not implemented.');
    }

}

@Abstract()
export abstract class ContentOptions {
    abstract path: string | string[];
    abstract maxAge?: number;
    abstract hidden?: boolean;
    abstract index?: string;
    abstract encode?: string;
    abstract extensions?: boolean;
}