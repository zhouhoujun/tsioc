import { Module } from '@tsdi/ioc';
import { TransformModule } from '../pipes/transform.module';
import { FILTER_PROVIDERS } from './filter.impl';


@Module({
    imports: [
        TransformModule,
    ],
    providers: [
        ...FILTER_PROVIDERS
    ],
    exports: [
        TransformModule
    ]
})
export class FilterModule {

}

