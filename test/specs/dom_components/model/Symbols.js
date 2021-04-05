import Editor from 'editor';
import { keySymbol, keySymbols } from 'dom_components/model/Component';

describe('Symbols', () => {
  let editor;
  let wrapper;
  const createSymbol = comp => {
    const symbol = comp.clone({ symbol: 1 });
    comp.parent().append(symbol, { at: comp.index() + 1 });
    return symbol;
  };
  const simpleComp = '<div data-a="b">Component</div>';
  const compMultipleNodes = `<div data-v="a">
    <div data-v="b">Component 1</div>
    <div data-v="c">Component 2</div>
  </div>`;

  beforeAll(() => {
    editor = new Editor();
    wrapper = editor.getWrapper();
  });

  afterAll(() => {
    wrapper = {};
    editor.destroy();
  });

  beforeEach(() => {});

  afterEach(() => {
    wrapper.components().reset();
  });

  test('Create symbol from a component', () => {
    const comp = wrapper.append(simpleComp)[0];
    const symbol = createSymbol(comp);
    const symbs = symbol.__getSymbols();
    expect(symbol.__isSymbol()).toBe(true);
    expect(comp.__getSymbol()).toBe(symbol);
    expect(symbs.length).toBe(1);
    expect(symbs[0]).toBe(comp);
    expect(comp.toHTML()).toBe(symbol.toHTML());
  });

  test('Create 1 symbol and clone the instance for another one', () => {
    const comp = wrapper.append(simpleComp)[0];
    const symbol = createSymbol(comp);
    const comp2 = createSymbol(comp);
    const symbs = symbol.__getSymbols();
    expect(symbs.length).toBe(2);
    expect(symbs[0]).toBe(comp);
    expect(symbs[1]).toBe(comp2);
    expect(comp2.__getSymbol()).toBe(symbol);
    expect(comp2.toHTML()).toBe(symbol.toHTML());
  });

  test('Create 1 symbol and clone it to have another instance', () => {
    const comp = wrapper.append(simpleComp)[0];
    const symbol = createSymbol(comp);
    const comp2 = createSymbol(symbol);
    const symbs = symbol.__getSymbols();
    expect(symbs.length).toBe(2);
    expect(symbs[0]).toBe(comp);
    expect(symbs[1]).toBe(comp2);
    expect(comp2.__getSymbol()).toBe(symbol);
    expect(comp2.toHTML()).toBe(symbol.toHTML());
  });

  test('Symbols and instances are correctly serialized', () => {
    const comp = wrapper.append(simpleComp)[0];
    const symbol = createSymbol(comp);
    const idComp = comp.getId();
    const idSymb = symbol.getId();
    const jsonComp = JSON.parse(JSON.stringify(comp));
    const jsonSymb = JSON.parse(JSON.stringify(symbol));
    expect(jsonComp[keySymbol]).toBe(idSymb);
    expect(jsonSymb[keySymbols]).toEqual([idComp]);
  });

  test("Removing one instance doesn't affect others", () => {
    const comp = wrapper.append(simpleComp)[0];
    const symbol = createSymbol(comp);
    const comp2 = createSymbol(comp);
    expect(wrapper.components().length).toBe(3);
    comp.remove();
    expect(wrapper.components().length).toBe(2);
    expect(comp2.__getSymbol()).toBe(symbol);
  });

  test('New component added to an instance is correctly propogated to all others', () => {
    const comp = wrapper.append(compMultipleNodes)[0];
    const compLen = comp.components().length;
    const symbol = createSymbol(comp);
    // Create and add 2 instances
    const comp2 = createSymbol(comp);
    const comp3 = createSymbol(comp2);
    const allInst = [comp, comp2, comp3];
    const all = [...allInst, symbol];
    all.forEach(cmp => expect(cmp.components().length).toBe(compLen));
    expect(wrapper.components().length).toBe(4);
    // Append new component to one of the instances
    const added = comp3.append(simpleComp, { at: 0 })[0];
    // The append should be propagated
    all.forEach(cmp => expect(cmp.components().length).toBe(compLen + 1));
    // The new added component became part of the symbol instance
    const addedSymb = added.__getSymbol();
    const symbAdded = symbol.components().at(0);
    expect(addedSymb).toBe(symbAdded);
    allInst.forEach(cmp =>
      expect(
        cmp
          .components()
          .at(0)
          .__getSymbol()
      ).toBe(symbAdded)
    );
    // The new main Symbol should keep the track of all instances
    expect(symbAdded.__getSymbols().length).toBe(allInst.length);
  });

  describe('Creating 3 symbols in the wrapper', () => {
    let allInst, all, comp, symbol, compInitChild;
    beforeEach(() => {
      comp = wrapper.append(compMultipleNodes)[0];
      compInitChild = comp.components().length;
      symbol = createSymbol(comp);
      const comp2 = createSymbol(comp);
      const comp3 = createSymbol(comp);
      allInst = [comp, comp2, comp3];
      all = [...allInst, symbol];
    });

    afterEach(() => {
      wrapper.components().reset();
    });

    test('The wrapper contains all the symbols', () => {
      expect(wrapper.components().length).toBe(all.length);
    });

    test('All the symbols contain the same amount of children', () => {
      all.forEach(cmp => expect(cmp.components().length).toBe(compInitChild));
    });

    test('Adding a new component to a symbol, it will be propogated to all instances', () => {
      const added = symbol.append(simpleComp, { at: 0 })[0];
      all.forEach(cmp =>
        expect(cmp.components().length).toBe(compInitChild + 1)
      );
      // Check symbol references
      expect(added.__getSymbols().length).toBe(allInst.length);
    });

    test('Adding a new component to an instance of the symbol, it will be propogated to all symbols', () => {
      comp.append(simpleComp, { at: 0 })[0];
      all.forEach(cmp =>
        expect(cmp.components().length).toBe(compInitChild + 1)
      );
    });

    test('Moving a new added component in the instance, will propagate the action in all symbols', () => {
      const added = comp.append(simpleComp)[0];
      const newChildLen = compInitChild + 1;
      added.move(comp, { at: 0 });
      const symbRef = added.__getSymbol();
      // All symbols still have the same amount of components
      all.forEach(cmp => expect(cmp.components().length).toBe(newChildLen));
      // All instances refer to the same symbol
      allInst.forEach(cmp =>
        expect(
          cmp
            .components()
            .at(0)
            .__getSymbol()
        ).toBe(symbRef)
      );
      // The moved symbol contains all its instances
      expect(
        symbol
          .components()
          .at(0)
          .__getSymbols().length
      ).toBe(allInst.length);
    });

    test.skip('Moving a new added component in the symbol, will propagate the action in all instances', () => {
      const added = symbol.append(simpleComp)[0];
      const newChildLen = compInitChild + 1;
      added.move(symbol, { at: 0 });
      const symbRef = added.__getSymbol();
      // All symbols still have the same amount of components
      all.forEach(cmp => expect(cmp.components().length).toBe(newChildLen));
    });

    test('Adding a class, reflects changes to all symbols', () => {
      const initSel = symbol.getSelectorsString();
      all.forEach(cmp => expect(cmp.getSelectorsString()).toBe(initSel));
      // Adding a class to a symbol
      symbol.addClass('myclass');
      const newSel = symbol.getSelectorsString();
      expect(newSel).not.toBe(initSel);
      all.forEach(cmp => expect(cmp.getSelectorsString()).toBe(newSel));
      // Adding a class to an instance
      comp.addClass('myclass2');
      const newSel2 = comp.getSelectorsString();
      expect(newSel2).not.toBe(newSel);
      all.forEach(cmp => expect(cmp.getSelectorsString()).toBe(newSel2));
    });

    test('Updating some prop, reflects changes to all symbols', () => {
      const propKey = 'someprop';
      const propValue = 'somevalue';
      all.forEach(cmp => expect(cmp.get(propKey)).toBeFalsy());
      // Updating the symbol
      symbol.set(propKey, propValue);
      all.forEach(cmp => expect(cmp.get(propKey)).toBe(propValue));
      // Updating the instance
      const propValue2 = 'somevalue2';
      comp.set(propKey, propValue2);
      all.forEach(cmp => expect(cmp.get(propKey)).toBe(propValue2));
    });

    test('Updating some attribute, reflects changes to all symbols', () => {
      const attrKey = 'data-attr';
      const attrValue = 'somevalue';
      all.forEach(cmp => expect(cmp.getAttributes()[attrKey]).toBeFalsy());
      // Updating the symbol
      symbol.addAttributes({ [attrKey]: attrValue });
      all.forEach(cmp => expect(cmp.getAttributes()[attrKey]).toBe(attrValue));
      // Updating the instance with another attribute
      const attrKey2 = 'data-attr2';
      const attrValue2 = 'somevalue2';
      comp.addAttributes({ [attrKey2]: attrValue2 });
      all.forEach(cmp => {
        const attrs = cmp.getAttributes();
        expect(attrs[attrKey]).toBe(attrValue);
        expect(attrs[attrKey2]).toBe(attrValue2);
      });
      // All symbols still have the same HTML
      const symbHtml = symbol.toHTML();
      all.forEach(cmp => expect(cmp.toHTML()).toBe(symbHtml));
    });
  });
});
