import { ConnectionStatupService, DIModule } from '@tsdi/core';
import { TypeOrmHelper } from './TypeOrmHelper';
import { TypeOrmModelParser } from './TypeOrmModelParser';
import { TypeormConnectionStatupService } from './TypeormConnectionStatupService';

@DIModule({
    regIn: 'root',
    providers: [
        { provide: ConnectionStatupService, useClass: TypeormConnectionStatupService },
        TypeOrmHelper,
        TypeOrmModelParser
    ]
})
export class TypeOrmModule { }
