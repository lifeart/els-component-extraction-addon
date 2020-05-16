const { transform } = require("ember-template-recast");

module.exports.transformSelection = function transformSelection(template, helpers = [] ) {
  const tokens = [];
  const scope = {};
  const externalTokens = new Set();
  const contextualTokens = new Set();
  const localTokens = new Set();
  const contextualTokensToRename = [];
  const localTokensToRename = [];
  const ignoredPaths = ['outlet', 'yield', 'component', 'else'];
  let blockScope = [];

  let { code } = transform(template.trim(), () => {
    return {
      Block: {
        enter(node) {
          blockScope = [...blockScope, ...node.blockParams];
        },
        exit(node) {
          node.blockParams.forEach(() => {
            blockScope.pop();
          });
        },
      },
      Template: {
        exit() {
          tokens.forEach((node) => {
            if (node.data) {
              externalTokens.add(node.parts[0]);
            } else if (node.this) {
              contextualTokens.add(node.parts[0]);
            } else {
              localTokens.add(node.parts[0]);
            }
          });

          Array.from(externalTokens).forEach((el) => {
            if (contextualTokens.has(el)) {
              contextualTokensToRename.push(el);
            }
          });
          Array.from(localTokens).forEach((el) => {
            if (contextualTokens.has(el) || externalTokens.has(el)) {
              localTokensToRename.push(el);
            }
          });
          tokens.forEach((node) => {
            const original = node.original;
            const isContextual = node.this === true;
            let [name] = node.parts;
            if (name) {
              const camelName = name.charAt(0).toUpperCase() + name.slice(1);
              const isLocalScoped = node.this === false && node.data === false;
              if (isContextual) {
                if (contextualTokensToRename.includes(name)) {
                  node.original = original.replace(
                    `this.${name}`,
                    `@scoped${camelName}`
                  );
                } else {
                  node.original = original.replace(
                    `this.${name}`,
                    `@${name}`
                  );
                }
              }

              if (isContextual && contextualTokensToRename.includes(name)) {
                scope[`@scoped${camelName}`] = `this.${name}`;
              } else if (isContextual) {
                scope[`@${name}`] = `this.${name}`;
              } else {
                if (node.data === true) {
                  scope[`@${name}`] = `@${name}`;
                } else {
                  if (localTokensToRename.includes(name)) {
                    scope[`@local${camelName}`] = `${node.parts[0]}`;
                    node.original = node.original.replace(
                      `${name}`,
                      `@local${camelName}`
                    );
                  } else {
                    scope[`@${name}`] = `${node.parts[0]}`;
                    node.original = node.original.replace(
                      `${name}`,
                      `@${name}`
                    );
                  }
                }
              }
            } else {
              node.original = "@context";
              scope[`@context`] = `this`;
            }
          });
        },
      },
      PathExpression(node) {
        // to-do figure out how to deal with local tokens
        if (node.data === false && node.this === false) {
          if (node.parts.length && blockScope.includes(node.parts[0])) {
            // tokens.push(node);
          } else if (node.original.includes(".")) {
            tokens.push(node);
          } else if (node.original.toLowerCase() !== node.original) {
            tokens.push(node);
          } else if (!helpers.includes(node.original) && !ignoredPaths.includes(node.original)) {
            tokens.push(node);
          }
          return;
        }
        tokens.push(node);
      },
    };
  });

  const keys = [];
  Object.keys(scope)
    .sort()
    .forEach((name) => {
      keys.push(`${name}={{${scope[name]}}}`);
    });

  return {
    code,
    args: keys
  };
};
