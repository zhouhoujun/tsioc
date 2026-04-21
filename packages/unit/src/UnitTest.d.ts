import { AbstractType } from '@tsdi/ioc';
import { UnitTestConfigure } from './UnitTestConfigure';
export declare class UnitTest {
}
export declare function runTest(src: string | AbstractType | (string | AbstractType)[], config?: UnitTestConfigure): Promise<any>;
