const { onComplete } = require('./index');

function createSimplePath(tagName, attributeName) {
    const astPath = {
        node: {
            type: 'TextNode'
        },
        parent: {
            type: 'AttrNode',
            name: attributeName
        },
        parentPath: {
            parent: {
                tag: tagName
            }
        }
    }
    return astPath;
}

describe('[role] attribute autocomplete', () => {
    it('should autocomplete role for [button] tag', () => {
        expect(onComplete('', {
            results: [],
            type: 'template',
            focusPath: createSimplePath('button', 'role')
        })).toMatchSnapshot();
    })
});

describe('[aria] attribute autocomplete', () => {
    it('should autocomplete [aria-dropeffect]', () => {
        expect(onComplete('', {
            results: [],
            type: 'template',
            focusPath: createSimplePath('ul', 'aria-dropeffect')
        })).toMatchSnapshot();
    })
})