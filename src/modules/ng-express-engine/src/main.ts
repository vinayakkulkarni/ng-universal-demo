import * as fs from 'fs';
import { Request, Response, Send } from 'express';

import { Provider, NgModuleFactory, Type, CompilerFactory, Compiler } from '@angular/core';
import { ResourceLoader } from '@angular/compiler';
import { INITIAL_CONFIG, renderModuleFactory, platformDynamicServer } from '@angular/platform-server';

import { FileLoader } from './file-loader';
import { REQUEST, RESPONSE } from './tokens';

/**
 * These are the allowed options for the engine
 */
export interface NgSetupOptions {
  bootstrap: Type<{}> | NgModuleFactory<{}>;
  providers?: Provider[];
}

/**
 * These are the allowed options for the render
 */
export interface RenderOptions extends NgSetupOptions {
  req: Request;
  res?: Response;
}

/**
 * This holds a cached version of each index used.
 */
const templateCache: { [key: string]: string } = {};

/**
 * Map of Module Factories
 */
const factoryCacheMap = new Map<Type<{}>, NgModuleFactory<{}>>();

/**
 * This is an express engine for handling Angular Applications
 */
export function ngExpressEngine(setupOptions: NgSetupOptions) {

  setupOptions.providers = setupOptions.providers || [];

  const compilerFactory: CompilerFactory = platformDynamicServer().injector.get(CompilerFactory);
  const compiler: Compiler = compilerFactory.createCompiler([
    {
      providers: [
        { provide: ResourceLoader, useClass: FileLoader }
      ]
    }
  ]);

  return function (filePath: string, options: RenderOptions, callback: Send) {

    options.providers = options.providers || [];

    try {
      const module = options.bootstrap || setupOptions.bootstrap;

      if (!module) {
        throw new Error('You must pass in a NgModule or NgModuleFactory to be bootstrapped');
      }

      const extraProviders = setupOptions.providers.concat(
        options.providers,
        getReqResProviders(options.req, options.res),
        [
          {
            provide: INITIAL_CONFIG,
            useValue: {
              document: getDocument(filePath),
              url: options.req.originalUrl
            }
          }
        ]);

      (new Promise<NgModuleFactory<{}>>(resolve => {

        let moduleFactory: NgModuleFactory<{}>;
        if (module instanceof Type) {
          moduleFactory = factoryCacheMap.get(module);

          if (moduleFactory) {
            resolve(moduleFactory);
            return;
          }

          compiler.compileModuleAsync(module).then((factory) => {
            factoryCacheMap.set(module, factory);
            resolve(factory);

          });
          return;
        }
        resolve(moduleFactory);
      })).then(factory => {
        renderModuleFactory(factory, {
          extraProviders: extraProviders
        })
          .then((html: string) => {
            callback(null, html);
          });
      })

    } catch (e) {
      callback(e);
    }
  };
}

/**
 * Get providers of the request and response
 */
function getReqResProviders(req: Request, res: Response): Provider[] {
  const providers: Provider[] = [
    {
      provide: REQUEST,
      useValue: req
    }
  ];
  if (res) {
    providers.push({
      provide: RESPONSE,
      useValue: res
    });
  }
  return providers;
}

/**
 * Get the document at the file path
 */
function getDocument(filePath: string): string {
  return templateCache[filePath] = templateCache[filePath] || fs.readFileSync(filePath).toString();
}
