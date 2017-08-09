import { ComponentInstance, ComponentMeta, ComponentInternalValues,
  HostElement, PlatformApi, PropChangeMeta } from '../../util/interfaces';
import { parsePropertyValue } from '../../util/data-parse';
import { MEMBER_METHOD, MEMBER_PROP, MEMBER_PROP_STATE, MEMBER_PROP_GLOBAL,
  MEMBER_STATE, MEMBER_ELEMENT_REF, PROP_CHANGE_METHOD_NAME, PROP_CHANGE_PROP_NAME } from '../../util/constants';
import { queueUpdate } from './update';


export function initProxy(plt: PlatformApi, elm: HostElement, instance: ComponentInstance, cmpMeta: ComponentMeta) {
  // used to store instance data internally so that we can add
  // getters/setters with the same name, and then do change detection
  const values: ComponentInternalValues = instance.__values = {};

  if (cmpMeta.propsWillChangeMeta) {
    // this component has prop WILL change methods, so init the object to store them
    values.__propWillChange = {};
  }

  if (cmpMeta.propsDidChangeMeta) {
    // this component has prop DID change methods, so init the object to store them
    values.__propDidChange = {};
  }

  if (cmpMeta.membersMeta) {
    for (var memberName in cmpMeta.membersMeta) {
      // add getters/setters for @Prop()s
      var memberMeta = cmpMeta.membersMeta[memberName];
      var memberType = memberMeta.memberType;

      if (memberType === MEMBER_PROP_GLOBAL) {
        // @Prop('coreGlobal')
        defineProperty(instance, memberName, Core[memberMeta.ctrlId]);

      } else if (memberType === MEMBER_METHOD) {
        // add a value getter on the dom's element instance
        // pointed at the instance's method
        defineProperty(elm, memberName, instance[memberName].bind(instance));

      } else if (memberType === MEMBER_ELEMENT_REF) {
        // add a getter to the element reference using
        // the member name the component meta provided
        defineProperty(instance, memberName, elm);

      } else {
        // @Prop and @State
        initProp(
          memberName,
          memberType,
          memberMeta.attribName,
          memberMeta.propType,
          values,
          plt,
          elm,
          instance,
          cmpMeta.propsWillChangeMeta,
          cmpMeta.propsDidChangeMeta
        );
      }
    }
  }
}


function initProp(
  memberName: string,
  memberType: number,
  attribName: string,
  propType: number,
  internalValues: ComponentInternalValues,
  plt: PlatformApi,
  elm: HostElement,
  instance: ComponentInstance,
  propWillChangeMeta: PropChangeMeta[],
  propDidChangeMeta: PropChangeMeta[]
) {

  if (memberType === MEMBER_STATE) {
    // @State() property, so copy the value directly from the instance
    // before we create getters/setters on this same property name
    internalValues[memberName] = (<any>instance)[memberName];

  } else {
    // @Prop() property, so check initial value from the proxy element and instance
    // before we create getters/setters on this same property name
    // we do this for @Prop(state: true) also
    const hostAttrValue = elm.getAttribute(attribName);
    if (hostAttrValue !== null) {
      // looks like we've got an initial value from the attribute
      internalValues[memberName] = parsePropertyValue(propType, hostAttrValue);

    } else if ((<any>elm)[memberName] !== undefined) {
      // looks like we've got an initial value on the proxy element
      internalValues[memberName] = parsePropertyValue(propType, (<any>elm)[memberName]);

    } else if ((<any>instance)[memberName] !== undefined) {
      // looks like we've got an initial value on the instance already
      internalValues[memberName] = (<any>instance)[memberName];
    }
  }

  let i = 0;
  if (propWillChangeMeta) {
    // there are prop WILL change methods for this component
    for (; i < propWillChangeMeta.length; i++) {
      if (propWillChangeMeta[i][PROP_CHANGE_PROP_NAME] === memberName) {
        // cool, we should watch for changes to this property
        // let's bind their watcher function and add it to our list
        // of watchers, so any time this property changes we should
        // also fire off their @PropWillChange() method
        internalValues.__propWillChange[memberName] = (<any>instance)[propWillChangeMeta[i][PROP_CHANGE_METHOD_NAME]].bind(instance);
      }
    }
  }

  if (propDidChangeMeta) {
    // there are prop DID change methods for this component
    for (i = 0; i < propDidChangeMeta.length; i++) {
      if (propDidChangeMeta[i][PROP_CHANGE_PROP_NAME] === memberName) {
        // cool, we should watch for changes to this property
        // let's bind their watcher function and add it to our list
        // of watchers, so any time this property changes we should
        // also fire off their @PropDidChange() method
        internalValues.__propDidChange[memberName] = (<any>instance)[propDidChangeMeta[i][PROP_CHANGE_METHOD_NAME]].bind(instance);
      }
    }
  }

  function getValue() {
    // get the property value directly from our internal values
    return internalValues[memberName];
  }

  function setValue(newVal: any) {
    if (MEMBER_PROP) {
      // TODO: remove this in prod mode!
      // this is not a stateful prop
      // so do not update the instance or host element
      console.warn(`@Prop() "${memberName}" on "${elm.tagName.toLowerCase()}" cannot be modified.`);
      return;
    }

    // check our new property value against our internal value
    const oldVal = internalValues[memberName];

    // TODO: account for Arrays/Objects
    if (newVal !== oldVal) {
      // gadzooks! the property's value has changed!!

      if (internalValues.__propWillChange && internalValues.__propWillChange[memberName]) {
        // this instance is watching for when this property WILL change
        internalValues.__propWillChange[memberName](newVal, oldVal);
      }

      // set our new value!
      internalValues[memberName] = newVal;

      if (internalValues.__propDidChange && internalValues.__propDidChange[memberName]) {
        // this instance is watching for when this property DID change
        internalValues.__propDidChange[memberName](newVal, oldVal);
      }

      // looks like this value actually changed, we've got work to do!
      // queue that we need to do an update, don't worry
      // about queuing up millions cuz this function
      // ensures it only runs once
      queueUpdate(plt, elm);
    }
  }

  if (memberType === MEMBER_PROP || memberType === MEMBER_PROP_STATE) {
    // dom's element instance
    // only place getters/setters on element for "@Prop"s
    // "@State" getters/setters should not be assigned to the element
    defineProperty(elm, memberName, 0, getValue, setValue);
  }

  // define on component class instance
  defineProperty(instance, memberName, 0, getValue, setValue);
}


function defineProperty(obj: any, propertyKey: string, value: any, getter?: any, setter?: any) {
  // minification shortcut
  const descriptor: PropertyDescriptor = {
    configurable: true
  };
  if (value) {
    descriptor.value = value;
  }
  if (getter) {
    descriptor.get = getter;
  }
  if (setter) {
    descriptor.set = setter;
  }
  Object.defineProperty(obj, propertyKey, descriptor);
}
