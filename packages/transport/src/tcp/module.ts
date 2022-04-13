import { Module, RouterModule, TransformModule } from '@tsdi/core';

@Module({
    imports: [
        TransformModule,
        RouterModule

    ]
})
export class TcpModule {

}
