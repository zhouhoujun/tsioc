import { IApplicationBuilder, ApplicationBuilder, DIModule, ProcessRunRootToken } from '@ts-ioc/bootstrap';
import { BrowserModule } from '@ts-ioc/platform-browser';
import { isUndefined } from '@ts-ioc/core';
declare let System: any;

let processRoot = !isUndefined(System) ? System.baseURL : '.';
/**
 * browser app.
 *
 * @export
 * @template T
 * @param {string} [baseURL]
 * @returns {IApplicationBuilderBrowser<T>}
 */
export function browserApp<T>(baseURL?: string): IApplicationBuilder<T> {
    return new ApplicationBuilder<T>(baseURL).use(BrowserBootstrapModule);
}

@DIModule({
    imports: [
        BrowserModule
    ],
    providers: [
        { provide: ProcessRunRootToken, useValue: processRoot }
    ],
    exports: [
        BrowserModule
    ]
})
export class BrowserBootstrapModule {

}

