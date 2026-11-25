import { Module } from '@tsdi/ioc';
import { SpaceComponent } from './space';

@Module({
    declarations: [SpaceComponent],
    exports: [SpaceComponent]
})
export class SpaceModule {}
