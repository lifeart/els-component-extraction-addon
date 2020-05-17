const { transformTests } = require("./testing-transformers");

describe("transformTests", () => {
  it("can do default transform for builtin blueprint", () => {
    expect(
      transformTests(
        `
        import { module, test } from 'qunit';
        import { setupRenderingTest } from 'ember-qunit';
        import { render } from '@ember/test-helpers';
        import { hbs } from 'ember-cli-htmlbars';
        
        module('Integration | Component | form/inline-edit-model-field', function(hooks) {
          setupRenderingTest(hooks);
        
          test('it renders', async function(assert) {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.set('myAction', function(val) { ... });
        
            await render(hbs\`<Form::InlineEditModelField />\`);
        
            assert.equal(this.element.textContent.trim(), '');
        
            // Template block usage:
            await render(hbs\`
              <Form::InlineEditModelField>
                template block text
              </Form::InlineEditModelField>
            \`);
        
            assert.equal(this.element.textContent.trim(), 'template block text');
          });
        });
        `,
        "MyComponent",
        [
          "isEnabled",
          "onClick",
          "models",
          "model",
          "itemlength",
          "hasColor",
          "canEdit",
          "itemSize",
          "disabled",
          "item",
          "collection",
          "usersArray",
          "handleClick",
          "loadItems",
        ]
      )
    ).toMatchSnapshot();
  });

  it("can do default transform for builtin blueprint without args", () => {
    expect(
      transformTests(
        `
        import { module, test } from 'qunit';
        import { setupRenderingTest } from 'ember-qunit';
        import { render } from '@ember/test-helpers';
        import { hbs } from 'ember-cli-htmlbars';
        
        module('Integration | Component | form/inline-edit-model-field', function(hooks) {
          setupRenderingTest(hooks);
        
          test('it renders', async function(assert) {
            // Set any properties with this.set('myProperty', 'value');
            // Handle any actions with this.set('myAction', function(val) { ... });
        
            await render(hbs\`<Form::InlineEditModelField />\`);
        
            assert.equal(this.element.textContent.trim(), '');
        
            // Template block usage:
            await render(hbs\`
              <Form::InlineEditModelField>
                template block text
              </Form::InlineEditModelField>
            \`);
        
            assert.equal(this.element.textContent.trim(), 'template block text');
          });
        });
        `,
        "MyComponent", ['context', 'boo'], { boo: 12 } 
      )
    ).toMatchSnapshot();
  });
});
