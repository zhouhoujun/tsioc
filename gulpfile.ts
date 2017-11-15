import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
// import 'development-tool-node';

Development.create(gulp, __dirname, [
    <ITaskOption>{
        src: 'src',
        dist: 'lib',
        testSrc: 'test/**/*.spec.ts',
        loader: 'development-tool-node'
    }
]).start();
