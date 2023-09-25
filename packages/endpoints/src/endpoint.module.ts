import { Module } from '@tsdi/ioc';
import { LogInterceptor } from './logger/log';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { TransportExecptionHandlers } from './execption.handlers';
import { Session } from './middleware/session';



@Module({
    providers: [
        LogInterceptor,
        TransportExecptionHandlers,
        FinalizeFilter,
        ExecptionFinalizeFilter,
        Session
    ]
})
export class EndpointModule {

}
