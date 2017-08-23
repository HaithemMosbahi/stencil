import { ATTR_LOWER_CASE } from '../../../util/constants';
import { validateBuildConfig } from '../validation';
import { BuildConfig } from '../../../util/interfaces';
import { mockFs, mockLogger, mockStencilSystem } from '../../../test';
import * as path from 'path';


describe('validation', () => {

  describe('validateBuildConfig', () => {

    it('should default prerenderIndex.maxConcurrent', () => {
      validateBuildConfig(config);
      expect(config.prerender.maxConcurrent).toBe(4);
    });

    it('should default prerenderIndex.include', () => {
      validateBuildConfig(config);
      expect(config.prerender.include[0].url).toBe('/');
    });

    it('should default prerenderIndex.crawl', () => {
      validateBuildConfig(config);
      expect(config.prerender.crawl).toBe(true);
    });

    it('should default prerenderIndex.prerenderDir', () => {
      validateBuildConfig(config);
      expect(config.prerender.prerenderDir).toBeDefined();
    });

    it('should default prerenderIndex.inlineStyles', () => {
      validateBuildConfig(config);
      expect(config.prerender.inlineStyles).toBe(true);
    });

    it('should default prerenderIndex.removeUnusedStyles', () => {
      validateBuildConfig(config);
      expect(config.prerender.removeUnusedStyles).toBe(true);
    });

    it('should default prerenderIndex.collapseWhitespace', () => {
      validateBuildConfig(config);
      expect(config.prerender.collapseWhitespace).toBe(true);
    });

    it('should default prerenderIndex.inlineLoaderScript', () => {
      validateBuildConfig(config);
      expect(config.prerender.inlineLoaderScript).toBe(true);
    });

    it('should default prerenderIndex', () => {
      validateBuildConfig(config);
      expect(config.prerender).toBeDefined();
    });

    it('should not set prerenderIndex if null', () => {
      config.prerender = null;
      validateBuildConfig(config);
      expect(config.prerender).toBe(null);
    });

    it('should default generateCollection to false', () => {
      validateBuildConfig(config);
      expect(config.generateCollection).toBe(false);
    });

    it('should default hashedFileNameLength', () => {
      validateBuildConfig(config);
      expect(config.hashedFileNameLength).toBe(8);
    });

    it('should default hashFileNames to false in watch mode despite prod mode', () => {
      config.watch = true;
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.hashFileNames).toBe(false);
    });

    it('should default hashFileNames to true in prod mode', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.hashFileNames).toBe(true);
    });

    it('should default hashFileNames to false in dev mode', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.hashFileNames).toBe(false);
    });

    it('should set minifyJs to true', () => {
      config.devMode = true;
      config.minifyJs = true;
      validateBuildConfig(config);
      expect(config.minifyJs).toBe(true);
    });

    it('should default minifyJs to true in prod mode', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.minifyJs).toBe(true);
    });

    it('should default minifyJs to false in dev mode', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.minifyJs).toBe(false);
    });

    it('should set minifyCss to true', () => {
      config.devMode = true;
      config.minifyCss = true;
      validateBuildConfig(config);
      expect(config.minifyCss).toBe(true);
    });

    it('should default minifyCss to true in prod mode', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.minifyCss).toBe(true);
    });

    it('should default minifyCss to false in dev mode', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.minifyCss).toBe(false);
    });

    it('should default watch to false', () => {
      validateBuildConfig(config);
      expect(config.watch).toBe(false);
    });

    it('should set devMode to false', () => {
      config.devMode = false;
      validateBuildConfig(config);
      expect(config.devMode).toBe(false);
    });

    it('should set devMode to true', () => {
      config.devMode = true;
      validateBuildConfig(config);
      expect(config.devMode).toBe(true);
    });

    it('should default devMode to false', () => {
      validateBuildConfig(config);
      expect(config.devMode).toBe(false);
    });

    it('should set publicPath from custom buildDir', () => {
      config.wwwIndexHtml = '/my/custom/index.html';
      config.buildDir = '/my/custom/build-dist';
      validateBuildConfig(config);
      expect(config.publicPath).toBe('build-dist/');
      expect(path.isAbsolute(config.publicPath)).toBe(false);
    });

    it('should set default publicPath and convert to relative path', () => {
      validateBuildConfig(config);
      expect(config.publicPath).toBe('build/');
    });

    it('should set default wwwIndexHtml and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.wwwIndexHtml)).toBe('index.html');
      expect(path.isAbsolute(config.wwwIndexHtml)).toBe(true);
    });

    it('should set default indexHtmlSrc and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.srcIndexHtml)).toBe('index.html');
      expect(path.isAbsolute(config.srcIndexHtml)).toBe(true);
    });

    it('should set default collection dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.collectionDir)).toBe('collection');
      expect(path.isAbsolute(config.collectionDir)).toBe(true);
    });

    it('should set default build dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.buildDir)).toBe('build');
      expect(path.isAbsolute(config.buildDir)).toBe(true);
    });

    it('should set default www dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.wwwDir)).toBe('build');
      expect(path.isAbsolute(config.wwwDir)).toBe(true);
    });

    it('should set default src dir and convert to absolute path', () => {
      validateBuildConfig(config);
      expect(path.basename(config.srcDir)).toBe('src');
      expect(path.isAbsolute(config.srcDir)).toBe(true);
    });

    it('should convert global to absolute path, if a global property was provided', () => {
      config.global = 'src/global/index.ts';
      validateBuildConfig(config);
      expect(path.basename(config.global)).toBe('index.ts');
      expect(path.isAbsolute(config.global)).toBe(true);
    });

    it('should not allow special characters in namespace', () => {
      expect(() => {
        config.namespace = 'My-Namespace';
        validateBuildConfig(config);
      }).toThrow();
      expect(() => {
        config.namespace = 'My/Namespace';
        validateBuildConfig(config);
      }).toThrow();
      expect(() => {
        config.namespace = 'My%20Namespace';
        validateBuildConfig(config);
      }).toThrow();
    });

    it('should not allow number for first character of namespace', () => {
      expect(() => {
        config.namespace = '88MyNamespace';
        validateBuildConfig(config);
      }).toThrow();
    });

    it('should enforce namespace being at least 3 characters', () => {
      expect(() => {
        config.namespace = 'ab';
        validateBuildConfig(config);
      }).toThrow();
    });

    it('should set user namespace', () => {
      config.namespace = 'MyNamespace';
      validateBuildConfig(config);
      expect(config.namespace).toBe('MyNamespace');
    });

    it('should set default namespace', () => {
      validateBuildConfig(config);
      expect(config.namespace).toBe('App');
    });

    it('should throw error for missing sys', () => {
      expect(() => {
        config.sys = null;
        validateBuildConfig(config);
      }).toThrowError('config.sys required');
    });

    it('should throw error for missing logger', () => {
      expect(() => {
        config.logger = null;
        validateBuildConfig(config);
      }).toThrowError('config.logger required');
    });

    it('should throw error for missing rootDir', () => {
      expect(() => {
        config.rootDir = null;
        validateBuildConfig(config);
      }).toThrowError('config.rootDir required');
      expect(() => {
        config.rootDir = undefined;
        validateBuildConfig(config);
      }).toThrowError('config.rootDir required');
    });

    it('should throw error for blank config', () => {
      expect(() => {
        validateBuildConfig(null);
      }).toThrowError('invalid build config');
      expect(() => {
        validateBuildConfig(undefined);
      }).toThrowError('invalid build config');
    });

  });

  var sys = mockStencilSystem();
  var config: BuildConfig;
  var logger = mockLogger();

  beforeEach(() => {
    config = {
      sys: sys,
      logger: logger,
      rootDir: '/User/some/path/',
      suppressTypeScriptErrors: true
    };
  });
  sys.fs = mockFs();

});
