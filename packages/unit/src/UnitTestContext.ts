import { BootContext, createAnnoationContext } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';
import { Type, Refs, Injectable } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';


@Injectable()
@Refs('@Suite', BootContext)
export class UnitTestContext extends BootContext {

    configures?: (string | UnitTestConfigure)[];

    static parse(target: Type<any> | UnitTestOptions, raiseContainer?: IContainer | (() => IContainer)): UnitTestContext {
        return createAnnoationContext(UnitTestContext, target, raiseContainer);
    }
}
