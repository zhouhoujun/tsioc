import { Module } from '@tsdi/ioc';
import { LogInterceptor } from './logger/log';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';
import { TransportExecptionHandlers } from './execption.handlers';



@Module({
    providers: [
        LogInterceptor,

        TransportExecptionHandlers,
        FinalizeFilter,
        ExecptionFinalizeFilter
    ]
})
export class EndpointModule {

}
