import { DIModule } from '@ts-ioc/bootstrap';
import { ServerBootstrapModule } from '@ts-ioc/platform-server-bootstrap';
import { ConsoleReporter } from './console';
import { ServerModule } from '@ts-ioc/platform-server';


@DIModule({
    imports: [
        ServerModule,
        ServerBootstrapModule
    ],
    providers: [
        ConsoleReporter
    ],
    exports: [
        ServerModule,
        ServerBootstrapModule
    ]
})
export class ConsoleReportModule {

}
