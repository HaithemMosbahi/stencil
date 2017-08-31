import { h, t } from '../h';
import { SVG_NS } from '../../../util/constants';


describe('h()', () => {

  it('should get vnode with only tag string', () => {
    var vnode = h('div', 0);
    expect(vnode.vtag).toEqual('div');
  });

  it('should get vnode with tag and data', () => {
    var vnode = h('div', { a: { id: 'my-id' } });
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vattrs).toBeDefined();
    expect(vnode.vattrs.id).toBe('my-id');
  });

  it('should get vnode with tag and child text', () => {
    var vnode = h('div', 0, 'child text');
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren[0].vtext).toBe('child text');
  });

  it('should get vnode with tag and multiple child text', () => {
    var vnode = (<any>h)('div', 0, 'child 1', 'child 2');
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren[0].vtext).toBe('child 1child 2');
  });

  it('should get vnode with tag and child number', () => {
    var vnode = h('div', 0, 0);
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren[0].vtext).toBe('0');
  });

  it('should get vnode with tag with multiple child h()', () => {
    var vnode = h('div', 0, h('child-a', 0), h('child-b', 0));
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren).toBeDefined();
    expect(vnode.vchildren.length).toBe(2);
    expect(vnode.vchildren[0].vtag).toBe('child-a');
    expect(vnode.vchildren[1].vtag).toBe('child-b');
  });

  it('should get vnode with tag with one child h()', () => {
    var vnode = h('parent', 0, h('child', 0));
    expect(vnode.vtag).toEqual('parent');
    expect(vnode.vchildren).toBeDefined();
    expect(vnode.vchildren.length).toBe(1);
    expect(vnode.vchildren[0].vtag).toBe('child');
  });

  it('should get vnode with tag with two child h()', () => {
    var vnode = h('parent', 0, h('child-a', 0), h('child-b', 0));
    expect(vnode.vtag).toEqual('parent');
    expect(vnode.vchildren).toBeDefined();
    expect(vnode.vchildren.length).toBe(2);
    expect(vnode.vchildren[0].vtag).toBe('child-a');
    expect(vnode.vchildren[1].vtag).toBe('child-b');
  });

  it('should get vnode with tag, data, child text', () => {
    var vnode = h('div', { a: { id: 'my-id' } }, 'child text');
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vattrs).toBeDefined();
    expect(vnode.vchildren[0].vtext).toBe('child text');
  });

  it('should get vnode with tag, data, child number', () => {
    var vnode = h('div', { a: { id: 'my-id' } }, 0);
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vattrs).toBeDefined();
    expect(vnode.vchildren[0].vtext).toBe('0');
  });

  it('should get vnode with tag, data, one child h()', () => {
    var vnode = h('div', { a: { id: 'my-id' } }, h('child-a', 0));
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vattrs).toBeDefined();
    expect(vnode.vchildren).toBeDefined();
    expect(vnode.vchildren.length).toBe(1);
    expect(vnode.vchildren[0].vtag).toBe('child-a');
  });

  it('should get vnode with tag, data, array of children h()', () => {
    var vnode = h('div', { a: { id: 'my-id' } },
      h('child-a', 0),
      h('child-b', 0)
    );
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vattrs).toBeDefined();
    expect(vnode.vchildren).toBeDefined();
    expect(vnode.vchildren.length).toBe(2);
    expect(vnode.vchildren[0].vtag).toBe('child-a');
    expect(vnode.vchildren[1].vtag).toBe('child-b');
  });

  it('should add multiple classes from string, w/ extra whitespace', () => {
    var vnode = h('div', { c: '  dragons   love  tacos  ' });
    expect(vnode.vclass).toBeDefined();
    expect(Object.keys(vnode.vclass).length).toBe(3);
    expect(vnode.vclass['dragons']).toBe(true);
    expect(vnode.vclass['love']).toBe(true);
    expect(vnode.vclass['tacos']).toBe(true);
  });

  it('should add one class from string', () => {
    var vnode = h('div', { c: 'some-class' });
    expect(vnode.vclass).toBeDefined();
    expect(vnode.vclass['some-class']).toBe(true);
  });

  it('should add class from map of classnames and booleans', () => {
    var vnode = h('div', { c: { enabled: true, checked: false } });
    expect(vnode.vclass).toBeDefined();
    expect(vnode.vclass.enabled).toBe(true);
    expect(vnode.vclass.checked).toBe(false);
  });

  it('should add props', () => {
    var vnode = h('div', { p: { id: 'my-id', checked: false, count: 0 } });
    expect(vnode.vprops).toBeDefined();
    expect(vnode.vprops.id).toBe('my-id');
    expect(vnode.vprops.checked).toBe(false);
    expect(vnode.vprops.count).toBe(0);
  });

  it('should add attrs', () => {
    var vnode = h('div', { a: { id: 'my-id', checked: false, count: 0 } });
    expect(vnode.vattrs).toBeDefined();
    expect(vnode.vattrs.id).toBe('my-id');
    expect(vnode.vattrs.checked).toBe(false);
    expect(vnode.vattrs.count).toBe(0);
  });

  it('should add on', () => {
    function onClick() {}
    var vnode = h('div', { o: { click: onClick } });
    expect(vnode.vlisteners).toBeDefined();
    expect(vnode.vlisteners.click).toBe(onClick);
  });

  it('should add style', () => {
    var vnode = h('div', { s: { marginLeft: '10px' } });
    expect(vnode.vstyle).toBeDefined();
    expect(vnode.vstyle.marginLeft).toBe('10px');
  });

  it('should add key string', () => {
    var vnode = h('div', { k: 'my-key' });
    expect(vnode.vkey).toBe('my-key');
  });

  it('should add key number', () => {
    var vnode = h('div', { k: 88 });
    expect(vnode.vkey).toBe(88);
  });

  it('should manually add namespace', () => {
    var vnode = h('idk', { n: 'whatever' });
    expect(vnode.vnamespace).toBe('whatever');
  });

  it('should add svg namespace to top h()', () => {
    var vnode = h('svg', { n: SVG_NS });
    expect(vnode.vnamespace).toBe(SVG_NS);
  });

  it('can create vnode with proper tag', () => {
    expect(h('div', 0).vtag).toEqual('div');
    expect(h('a', 0).vtag).toEqual('a');
  });

  it('can create vnode with children', () => {
    var vnode = h('div', 0, h('span', 0), h('b', 0));
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren[0].vtag).toEqual('span');
    expect(vnode.vchildren[1].vtag).toEqual('b');
  });

  it('can create vnode with one child vnode', () => {
    var vnode = h('div', 0,  h('span', 0));
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren[0].vtag).toEqual('span');
  });

  it('can create vnode with no props and one child vnode', () => {
    var vnode = h('div', 0, h('span', 0));
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren[0].vtag).toEqual('span');
  });

  it('can create vnode text with dynamic string', () => {
    var val = 'jazzhands';
    var vnode = h('div', 0, val);
    expect(vnode.vtag).toEqual('div');
    expect(vnode.vchildren[0].vtext).toEqual('jazzhands');
  });

  it('can create vnode with text content in string', () => {
    var vnode = h('a', 0, 'I am a string');
    expect(vnode.vchildren[0].vtext).toEqual('I am a string');
  });


  describe('t()', () => {

    it('h() can use t() with text', () => {
      var vnode = (<any>h)('div', 0, t('1.21'), 'gigawatts');
      expect(vnode.vtag).toBe('div');
      expect(vnode.vchildren[0].vtext).toEqual('1.21');
      expect(vnode.vchildren[1].vtext).toEqual('gigawatts');
    });

    it('h() can use multiple t()', () => {
      var vnode = (<any>h)('div', 0, t('88'), t('mph'));
      expect(vnode.vtag).toBe('div');
      expect(vnode.vchildren[0].vtext).toEqual('88');
      expect(vnode.vchildren[1].vtext).toEqual('mph');
    });

    it('can create vnode text', () => {
      var vnode = t('doc');
      expect(vnode.vtag).toBeUndefined();
      expect(vnode.vchildren).toBeUndefined();
      expect(vnode.vtext).toEqual('doc');
    });

  });

});
