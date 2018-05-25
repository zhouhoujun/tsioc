import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';

Development.create(gulp, __dirname, [
    <ITaskOption>{
        src: 'src',
        dist: 'lib',
        testSrc: 'test/**/*.spec.ts',
        loader: 'development-tool-node'
    }
]).start();
