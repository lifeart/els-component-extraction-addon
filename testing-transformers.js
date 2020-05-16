const babel = require("@babel/core");

function isUpperCased(char) {
  if (typeof char !== "string") {
    return false;
  }
  return char.toUpperCase() === char;
}

function variableMockByName(name) {
  const lowerName = name.toLowerCase();

  if (
    name.endsWith("s") ||
    lowerName.includes("collection") ||
    lowerName.includes("array")
  ) {
    return [
      { id: 1, name: "one" },
      { id: 2, name: "two" },
    ];
  }
  if (
    (name.startsWith("on") && isUpperCased(name.charAt(2))) ||
    name.includes("hande") ||
    name.includes("load")
  ) {
    return `() => assert.ok("event:${name}")`;
  }
  if (name.startsWith("is") && isUpperCased(name.charAt(2))) {
    return true;
  }
  if (name.startsWith("has") && isUpperCased(name.charAt(3))) {
    return false;
  }
  if (name.startsWith("can") && isUpperCased(name.charAt(3))) {
    return true;
  }
  if (
    name.startsWith("disabled") ||
    name.startsWith("checked") ||
    name.includes("show") ||
    name.includes("hide") ||
    name.startsWith("enabled") ||
    name.startsWith("should") ||
    name.startsWith("needs")
  ) {
    return true;
  }
  const numeric = [
    "age",
    "count",
    "number",
    "percent",
    "total",
    "length",
    "size",
  ];
  let hasNumericWord = numeric.find((el) => lowerName.includes(el));
  if (hasNumericWord) {
    return 42;
  }
  const objectLike = ["model", "map", "hash"];
  let isObjectLike = objectLike.find((el) => lowerName.includes(el));
  if (isObjectLike) {
    return {
      foo: "bar",
    };
  }
  return lowerName;
}

module.exports.transformTests = function transformTests(
  text,
  componentName,
  args = []
) {
  function transform(babel) {
    const { types: t, template } = babel;

    const scopeValues = {};
    args.forEach((name) => {
      scopeValues[name] = variableMockByName(name);
    });

    let tpl = [];
    let ctpl = [];
    Object.keys(scopeValues).forEach((key) => {
      let value = scopeValues[key];
      if (typeof value === "string" && value.includes("=>")) {
        value = value.toString();
      } else {
        value = JSON.stringify(value);
      }
      tpl.push(`this.set('${key}', ${value});`);
      ctpl.push(`@${key}={{this.${key}}}`);
    });

    return {
      name: "ast-transform", // not required
      visitor: {
        FunctionExpression(path) {
          if (path.node.async !== true) {
            return;
          }
          const mainBody = path.node.body.body;
          mainBody.forEach((el) => {
            if (t.isExpressionStatement(el)) {
              el.leadingComments = [];
            }
          });
          const shift = new Array(4).fill(" ").join("");
          const fn = template`${tpl
            .map((e, index) => (index ? shift + e : e))
            .join("\n")}`;
          ctpl.unshift("hbs`<" + componentName);
          ctpl.push("/>`");
          // need this to get rid of extra semicolon
          const cfn = template`[${ctpl.join(" ")}]`;
          const ast = fn({});
          mainBody.unshift(ast);
          let render = mainBody.find(
            (el) =>
              t.isExpressionStatement(el) && t.isAwaitExpression(el.expression)
          );
          render.expression.argument.arguments = [];
          const newComponentDefinition = cfn({});
          render.expression.argument.arguments.push(
            newComponentDefinition.expression.elements[0]
          );
          mainBody.pop();
          mainBody.pop();
        },
      },
    };
  }

  const { code } = babel.transformSync(text, {
    plugins: [transform],
  });

  return code;
};
