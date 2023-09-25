import { Module } from '@tsdi/ioc';
import { LogInterceptor } from './logger/log';
import { FinalizeFilter } from './finalize.filter';
import { ExecptionFinalizeFilter } from './execption.filter';



@Module({
    providers: [
        LogInterceptor,
        
        FinalizeFilter,
        ExecptionFinalizeFilter
    ]
})
export class EndpointModule {

}
