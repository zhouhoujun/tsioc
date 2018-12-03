import { IApplicationBuilder, ApplicationBuilder, DIModule } from '@ts-ioc/bootstrap';
import { BrowserModule } from '@ts-ioc/platform-browser';



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
    exports: [
    ]
})
export class BrowserBootstrapModule {

}

