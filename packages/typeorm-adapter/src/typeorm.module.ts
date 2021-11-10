import { Module } from '@tsdi/ioc';
import { ParseObjectIdPipe } from './objectid.pipe';
import { TypeOrmHelper } from './helper';
import { TypeormServer } from './TypeormServer';

@Module({
    providedIn: 'root',
    providers: [
        TypeormServer,
        TypeOrmHelper,
        ParseObjectIdPipe,
    ]
})
export class TypeOrmModule { }
