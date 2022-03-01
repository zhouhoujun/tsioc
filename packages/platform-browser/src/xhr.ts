import { XhrFactory } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';

/**
 * A factory for `HttpXhrBackend` that uses the `XMLHttpRequest` browser API.
 */
@Injectable()
export class BrowserXhr implements XhrFactory {
    build(): XMLHttpRequest {
        return new XMLHttpRequest();
    }
}
