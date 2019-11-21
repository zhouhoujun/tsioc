import { Type, Refs, Injectable, ContainerFactory, createRaiseContext } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext, BootOption } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';


@Injectable()
@Refs('@Suite', BootContext)
export class UnitTestContext extends BootContext<BootOption, UnitTestConfigure> {

    static parse(target: Type | UnitTestOptions, raiseContainer?: ContainerFactory<IContainer>): UnitTestContext {
        return createRaiseContext(UnitTestContext, target, raiseContainer);
    }
}
