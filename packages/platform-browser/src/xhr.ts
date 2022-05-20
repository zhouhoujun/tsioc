import { Injectable } from '@tsdi/ioc';
import { XhrFactory } from '@tsdi/common';

/**
 * A factory for `HttpXhrBackend` that uses the `XMLHttpRequest` browser API.
 */
@Injectable()
export class BrowserXhr implements XhrFactory {
    build(): XMLHttpRequest {
        return new XMLHttpRequest()
    }
}
