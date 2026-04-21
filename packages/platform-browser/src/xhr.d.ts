import { XhrFactory } from '@tsdi/common/http';
/**
 * A factory for `HttpXhrBackend` that uses the `XMLHttpRequest` browser API.
 */
export declare class BrowserXhr implements XhrFactory {
    build(): XMLHttpRequest;
}
