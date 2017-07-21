import { BuildConfig, ComponentMeta, Manifest } from '../../../util/interfaces';
import { mockStencilSystem } from '../../../test';
import { ModuleFileMeta } from '../../interfaces';
import { parseBundles, parseComponent, parseDependentGlobal, serializeBundles, serializeComponent, serializeProjectGlobal, ManifestData } from '../manifest-data';
import { HAS_NAMED_SLOTS, HAS_SLOTS, PRIORITY_LOW, TYPE_BOOLEAN, TYPE_NUMBER } from '../../../util/constants';


describe('manifest-data serialize/parse', () => {

  it('parseDependentGlobal', () => {
    const manifestData: ManifestData = {
      global: 'global/my-global.js'
    };
    const manifest: Manifest = {};
    parseDependentGlobal(config, manifestDir, manifestData, manifest);
    expect(manifest.dependentManifests.length).toBe(1);
    expect(manifest.dependentManifests[0].global.jsFilePath).toBe('/User/me/myapp/dist/collection/global/my-global.js');
  });

  it('serializeProjectGlobal', () => {
    const manifestData: ManifestData = {};
    const manifest: Manifest = {
      global: {
        jsFilePath: '/User/me/myapp/dist/collection/global/my-global.js'
      }
    };

    serializeProjectGlobal(config, manifestDir, manifestData, manifest);
    expect(manifestData.global).toBe('global/my-global.js');
  });

  it('parseBundles', () => {
    const manifestData: ManifestData = {
      bundles: [
        { components: ['cmp-a', 'cmp-b'] },
        { components: ['cmp-c'] }
      ]
    };
    const manifest: Manifest = {};
    parseBundles(manifestData, manifest);
    expect(manifest.bundles[0].components[0]).toBe('cmp-a');
    expect(manifest.bundles[0].components[1]).toBe('cmp-b');
    expect(manifest.bundles[1].components[0]).toBe('cmp-c');
  });

  it('serializeBundles', () => {
    config.bundles = [
      { components: ['cmp-a', 'cmp-b'] },
      { components: ['cmp-c'] }
    ];

    const manifestData: ManifestData = {
      bundles: []
    };
    serializeBundles(config, manifestData);
    expect(manifestData.bundles[0].components[0]).toBe('cmp-a');
    expect(manifestData.bundles[0].components[1]).toBe('cmp-b');
    expect(manifestData.bundles[1].components[0]).toBe('cmp-c');
  });

  it('loadPriority', () => {
    a.loadPriority = PRIORITY_LOW;
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.priority).toBe('low');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.loadPriority).toBe(PRIORITY_LOW);
  });

  it('isShadowMeta', () => {
    a.isShadowMeta = true;
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.shadow).toBe(true);
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.isShadowMeta).toBe(true);
  });

  it('slotMeta HAS_NAMED_SLOTS', () => {
    a.slotMeta = HAS_NAMED_SLOTS;
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.slot).toBe('hasNamedSlots');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.slotMeta).toBe(HAS_NAMED_SLOTS);
  });

  it('slotMeta HAS_SLOTS', () => {
    a.slotMeta = HAS_SLOTS;
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.slot).toBe('hasSlots');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.slotMeta).toBe(HAS_SLOTS);
  });

  it('hostMeta', () => {
    a.hostMeta = { theme: { 'some-class': true } };
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.host.theme['some-class']).toBe(true);
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.hostMeta.theme['some-class']).toBe(true);
  });

  it('methodsMeta', () => {
    a.methodsMeta = ['methodA', 'methodB'];
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.methods[0]).toBe('methodA');
    expect(cmpData.methods[1]).toBe('methodB');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.methodsMeta[0]).toBe('methodA');
    expect(b.cmpMeta.methodsMeta[1]).toBe('methodB');
  });

  it('listeners', () => {
    a.listenersMeta = [
      { eventName: 'eventA', eventMethodName: 'methodA', eventPassive: true, eventCapture: true, eventEnabled: true }
    ];
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.listeners[0].event).toBe('eventA');
    expect(cmpData.listeners[0].method).toBe('methodA');
    expect(cmpData.listeners[0].passive).toBe(true);
    expect(cmpData.listeners[0].capture).toBe(true);
    expect(cmpData.listeners[0].enabled).toBe(true);
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.listenersMeta[0].eventName).toBe('eventA');
    expect(b.cmpMeta.listenersMeta[0].eventMethodName).toBe('methodA');
    expect(b.cmpMeta.listenersMeta[0].eventPassive).toBe(true);
    expect(b.cmpMeta.listenersMeta[0].eventCapture).toBe(true);
    expect(b.cmpMeta.listenersMeta[0].eventEnabled).toBe(true);
  });

  it('statesMeta', () => {
    a.statesMeta = ['stateA', 'stateB'];
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.states[0]).toBe('stateA');
    expect(cmpData.states[1]).toBe('stateB');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.statesMeta[0]).toBe('stateA');
    expect(b.cmpMeta.statesMeta[1]).toBe('stateB');
  });

  it('propsDidChange', () => {
    a.propsDidChangeMeta = [
      ['nameA', 'methodA'],
      ['nameB', 'methodB']
    ];
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.propsDidChange[0].name).toBe('nameA');
    expect(cmpData.propsDidChange[0].method).toBe('methodA');
    expect(cmpData.propsDidChange[1].name).toBe('nameB');
    expect(cmpData.propsDidChange[1].method).toBe('methodB');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.propsDidChangeMeta[0][0]).toBe('nameA');
    expect(b.cmpMeta.propsDidChangeMeta[0][1]).toBe('methodA');
    expect(b.cmpMeta.propsDidChangeMeta[1][0]).toBe('nameB');
    expect(b.cmpMeta.propsDidChangeMeta[1][1]).toBe('methodB');
  });

  it('propsWillChange', () => {
    a.propsWillChangeMeta = [
      ['nameA', 'methodA'],
      ['nameB', 'methodB']
    ];
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.propsWillChange[0].name).toBe('nameA');
    expect(cmpData.propsWillChange[0].method).toBe('methodA');
    expect(cmpData.propsWillChange[1].name).toBe('nameB');
    expect(cmpData.propsWillChange[1].method).toBe('methodB');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.propsWillChangeMeta[0][0]).toBe('nameA');
    expect(b.cmpMeta.propsWillChangeMeta[0][1]).toBe('methodA');
    expect(b.cmpMeta.propsWillChangeMeta[1][0]).toBe('nameB');
    expect(b.cmpMeta.propsWillChangeMeta[1][1]).toBe('methodB');
  });

  it('propsMeta', () => {
    a.propsMeta = [
      { propName: 'nameA', propType: TYPE_BOOLEAN, isStateful: true },
      { propName: 'nameB', propType: TYPE_NUMBER, isStateful: false }
    ];
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.propsMeta[0].propName).toBe('nameA');
    expect(b.cmpMeta.propsMeta[0].propType).toBe(TYPE_BOOLEAN);
    expect(b.cmpMeta.propsMeta[0].isStateful).toBe(true);
    expect(b.cmpMeta.propsMeta[1].propName).toBe('nameB');
    expect(b.cmpMeta.propsMeta[1].propType).toBe(TYPE_NUMBER);
    expect(b.cmpMeta.propsMeta[1].isStateful).toBe(false);
  });

  it('assetsDirsMeta', () => {
    a.assetsDirsMeta = [{
      cmpRelativePath: 'svgs'
    }];
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.assetPaths[0]).toBe('components/svgs');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.assetsDirsMeta[0].absolutePath).toBe('/User/me/myapp/dist/collection/components/svgs');
    expect(b.cmpMeta.assetsDirsMeta[0].cmpRelativePath).toBe('svgs');
  });

  it('stylesMeta stylePaths', () => {
    a.stylesMeta = {
      ios: {
        cmpRelativePaths: ['cmp-a.scss']
      }
    };
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.styles.ios.stylePaths[0]).toBe('components/cmp-a.scss');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.stylesMeta.ios.cmpRelativePaths[0]).toBe('cmp-a.scss');
    expect(b.cmpMeta.stylesMeta.ios.absolutePaths[0]).toBe('/User/me/myapp/dist/collection/components/cmp-a.scss');
  });

  it('stylesMeta styleStr', () => {
    a.stylesMeta = {
      ios: {
        styleStr: 'cmp-a{color:red}'
      }
    };
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    b = parseComponent(config, manifestDir, cmpData);
    expect(a.stylesMeta.ios.styleStr).toBe(b.cmpMeta.stylesMeta.ios.styleStr);
  });

  it('js file path', () => {
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.componentPath).toBe('components/cmp-a.js');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.jsFilePath).toBe('/User/me/myapp/dist/collection/components/cmp-a.js');
  });

  it('componentClass', () => {
    a.componentClass = 'ComponentClass';
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.componentClass).toBe('ComponentClass');
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.componentClass).toBe(a.componentClass);
  });

  it('tag name', () => {
    a.tagNameMeta = 'ion-tag';
    const cmpData = serializeComponent(config, manifestDir, moduleFile);
    expect(cmpData.tag).toBe(a.tagNameMeta);
    b = parseComponent(config, manifestDir, cmpData);
    expect(b.cmpMeta.tagNameMeta).toBe(a.tagNameMeta);
  });

  beforeEach(() => {
    a = {};
    moduleFile = {
      jsFilePath: '/User/me/myapp/dist/collection/components/cmp-a.js',
      cmpMeta: a
    };
  });

  var a: ComponentMeta;
  var b: ModuleFileMeta;
  var moduleFile: ModuleFileMeta;
  var manifestDir = '/User/me/myapp/dist/collection/';
  var config: BuildConfig = {
    sys: mockStencilSystem()
  };

});
