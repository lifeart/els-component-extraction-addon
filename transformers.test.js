const { transformSelection } = require("./transformers");


describe('transformSelection', () => {

    it('can handle no-args case', () => {
        expect(transformSelection('<div></div>')).toMatchSnapshot();
    });
    it('can handle contextual args case', () => {
        expect(transformSelection('<div>{{this.foo}}</div>')).toMatchSnapshot();
    });
    it('can handle contextual args.path case', () => {
        expect(transformSelection('<div>{{this.foo.baz}}</div>')).toMatchSnapshot();
    });
    it('can handle contextual args.path multi case', () => {
        expect(transformSelection('<div>{{this.foo.baz}}{{this.foo.baz.boo}}</div>')).toMatchSnapshot();
    });
    it('can handle external args case', () => {
        expect(transformSelection('<div>{{@foo}}</div>')).toMatchSnapshot();
    });
    it('can handle external args.path case', () => {
        expect(transformSelection('<div>{{@foo.baz}}</div>')).toMatchSnapshot();
    });
    it('can handle external args.path multi case', () => {
        expect(transformSelection('<div>{{@foo.baz}} {{@foo.bar}}<</div>')).toMatchSnapshot();
    });
    it('can handle local args case', () => {
        expect(transformSelection('<div>{{foo.bar}}</div>')).toMatchSnapshot();
    });
    it('can handle local args multi case', () => {
        expect(transformSelection('<div>{{foo.bar}} {{foo.baz}}</div>')).toMatchSnapshot();
    });

    it('can handle same args case for contextual + external', () => {
        expect(transformSelection('<div>{{@foo.bar}} {{this.foo.baz}}</div>')).toMatchSnapshot();
        expect(transformSelection('<div>{{@foo.bar.boo}} {{this.foo.bar.baz}}</div>')).toMatchSnapshot();
    });

    it('can handle same args case for contextual + local', () => {
        expect(transformSelection('<div>{{this.foo.bar}} {{foo.baz}}</div>')).toMatchSnapshot();
        expect(transformSelection('<div>{{this.foo.bar.boo}} {{foo.bar.baz}}</div>')).toMatchSnapshot();
    });

    it('can handle same args case for external + local', () => {
        expect(transformSelection('<div>{{@foo.bar}} {{foo.baz}}</div>')).toMatchSnapshot();
        expect(transformSelection('<div>{{@foo.bar.boo}} {{foo.bar.baz}}</div>')).toMatchSnapshot();
    });

    it('can handle same args case for external + local + contextual', () => {
        expect(transformSelection('<div>{{@foo.bar}} {{foo.bar}} {{this.foo.bar}}</div>')).toMatchSnapshot();
        expect(transformSelection('<div>{{@foo.bar.boo}} {{foo.bar.boo}} {{this.foo.bar.boo}}</div>')).toMatchSnapshot();
    });
    
    it('can handle real case #1', () => {
        expect(transformSelection(`
            <div class="ui text container">
                <h1 style="margin-top:20px;" class="ui header">
                Journal #
                    {{model.journal_id}}
                </h1>
                    <SmJournal 
                        @model={{model}}
                        @autoresolve={{true}}
                        @currentUser={{currentUser}}
                        @commentsToggleClass=""
                    />
                {{outlet}}
            </div>
        `)).toMatchSnapshot();
    });

    it('can handle block case', () => {
        expect(transformSelection(`
           {{#foo-bar as |boo|}}
                {{boo}}
           {{/foo-bar}}
        `)).toMatchSnapshot();
        expect(transformSelection(`
          <FooBar as |boo|>
            {{boo}}
          </FooBar>
        `)).toMatchSnapshot();
    });

    it('can handle context as argument', () => {
        expect(transformSelection(`
            <MyComponent @model={{this}} />
        `)).toMatchSnapshot();
    });
});

