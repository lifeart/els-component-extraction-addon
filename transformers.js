const { transform, traverse, parse } = require("ember-template-recast");
const { rebelObject } = require("ember-meta-explorer");

function argsShapeFromTemplate(tpl) {
  const tokens = [];
  let blockScope = [];
  let currentBlockPath = [];
  let currentBlockArg = null;
  let paramsMap = {};
  traverse(parse(tpl), {
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
    BlockStatement: {
      enter(node) {
        if (node.path.type === "PathExpression") {
          if (node.path.original === "each") {
            const param = node.params[0];
            if (
              param.type === "PathExpression" &&
              (param.data || blockScope.includes(param.parts[0]))
            ) {
              let arrKey = `${param.original}.[]`;
              currentBlockPath.push(arrKey.replace(currentBlockArg || "", ""));
              paramsMap[arrKey] = node.program.blockParams[0];
              currentBlockArg = node.program.blockParams[0];
            }
          }
        }
      },
      exit(node) {
        if (node.path.type === "PathExpression") {
          if (node.path.original === "each") {
            const param = node.params[0];
            if (
              param.type === "PathExpression" &&
              (param.data || blockScope.includes(param.parts[0]))
            ) {
              currentBlockPath.pop();
              currentBlockArg = paramsMap[last(currentBlockPath)];
            }
          }
        }
      },
    },
    PathExpression(node) {
      if (node.data) {
        tokens.push(node.original);
      } else {
        const p = node.parts[0];
        if (
          !currentBlockPath.length ||
          !blockScope.length ||
          !currentBlockArg ||
          !blockScope.includes(p)
        ) {
          return;
        }
        let namePath = [];
        currentBlockPath.forEach((n) => {
          namePath.push(n);
        });
        let name = node.original.replace(currentBlockArg, "");
        if (name) {
          namePath.push(name);
        }
        if (blockScope.includes(currentBlockArg)) {
          tokens.push(namePath.join(""));
        }
      }
    },
  });
  const rawData = rebelObject(tokens).args || {};
  createArrays(rawData);
  return rawData;
}

function last(arr) {
  return arr[arr.length - 1];
}

function createArrays(obj, key = null, parent = {}) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return;
  }
  let props = Object.keys(obj);
  props.forEach((name) => {
    if (name === "[]") {
      createArrays(obj[name], name, obj);
      let value = obj[name];
      if (typeof value === "string") {
        parent[key] = ["foo", "bar", "baz"];
      } else {
        parent[key] = [
          JSON.parse(JSON.stringify(value)),
          JSON.parse(JSON.stringify(value)),
          JSON.parse(JSON.stringify(value)),
        ];
      }
    } else {
      createArrays(obj[name], name, obj);
    }
  });
  return;
}

module.exports.argsShapeFromTemplate = argsShapeFromTemplate;
function transformSelection(template, helpers = []) {
  const tokens = [];
  const scope = {};
  const externalTokens = new Set();
  const contextualTokens = new Set();
  const localTokens = new Set();
  const contextualTokensToRename = [];
  const localTokensToRename = [];
  const ignoredPaths = [
    "outlet",
    "yield",
    "component",
    "else",
    "on",
    "hash",
    "concat",
    "action",
    "each",
    "input",
    "mut",
    "each-in",
    "get",
    "if",
    "log",
    "debugger",
    "unless",
    "fn",
  ];
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
      ElementNode: {
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
                  node.original = original.replace(`this.${name}`, `@${name}`);
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
          } else if (node.original.includes("-")) {
            // skip component-like names
          } else if (node.original.includes(".")) {
            tokens.push(node);
          } else if (node.original.toLowerCase() !== node.original) {
            tokens.push(node);
          } else if (
            !helpers.includes(node.original) &&
            !ignoredPaths.includes(node.original)
          ) {
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

  let shape = {};
  try {
    shape = argsShapeFromTemplate(code);
  } catch (e) {
    //
  }

  return {
    code,
    shape,
    args: keys,
  };
}

module.exports.transformSelection = transformSelection;
