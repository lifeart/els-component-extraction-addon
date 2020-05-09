const aria = require("aria-query");

const elementRoles = {};
aria.elementRoles.forEach((value, { name }) => {
  elementRoles[name] = Array.from(value);
});
const areas = {};
aria.aria.forEach((value, name) => {
    areas[name] = value;
});
function isAttributeValue(focusPath) {
    return  focusPath.node.type === "TextNode" &&
    focusPath.parent.type === "AttrNode";
}
module.exports.onComplete = function(_, { focusPath, results, type }) {
  if (type !== "template") {
    return results;
  }
  if (
    isAttributeValue(focusPath)
  ) {
    let attributeName = focusPath.parent.name;
    let element = focusPath.parentPath.parent;
    if (element.tag in elementRoles && attributeName === "role") {
      elementRoles[element.tag].forEach(name => {
        results.push({
          label: name
        });
      });
    } else if (attributeName in areas && areas[attributeName].type === 'tokenlist') {
        areas[attributeName].values.forEach(name => {
            results.push({
              label: name
            });
        });
    }
  }

  return results;
};
