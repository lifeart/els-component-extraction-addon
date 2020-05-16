function normalizeToAngleBracketComponent(name) {
  const SIMPLE_DASHERIZE_REGEXP = /[a-z]|\/|-/g;
  const ALPHA = /[A-Za-z0-9]/;

  if (name.includes(".")) {
    return name;
  }

  return name.replace(SIMPLE_DASHERIZE_REGEXP, (char, index) => {
    if (char === "/") {
      return "::";
    }

    if (index === 0 || !ALPHA.test(name[index - 1])) {
      return char.toUpperCase();
    }

    // Remove all occurrences of '-'s from the name that aren't starting with `-`
    return char === "-" ? "" : char.toLowerCase();
  });
}

let matchFunctions = [];

function normalizeFilePath(filePath) {
  return filePath.split("\\").join("/");
}

function hasMatchFunctions() {
  return matchFunctions.length > 0;
}

function waitForFileNameContains(name, timeout = 10000) {
  let timeoutUid = null;
  let resolve = null;
  let reject = null;
  let deleteFunction = null;
  let item = new Promise((res, rej) => {
    resolve = res;
    reject = (reason) => {
      deleteFunction();
      rej(reason);
    };
  });
  timeoutUid = setTimeout(() => {
    reject("timeout");
  }, timeout);
  let fn = (uri) => {
    if (normalizeFilePath(uri).includes(name)) {
      deleteFunction();
      setTimeout(resolve);
    }
  };
  matchFunctions.push(fn);
  deleteFunction = () => {
    clearTimeout(timeoutUid);
    matchFunctions = matchFunctions.filter((f) => f !== fn);
  };
  return item;
}

function watcherFn(uri, changeType) {
  console.log('watcherFn', uri, changeType);
  // created
  if (changeType !== 1) {
    return;
  }
  matchFunctions.forEach((fn) => fn(uri));
}

module.exports.normalizeToAngleBracketComponent = normalizeToAngleBracketComponent;
module.exports.watcherFn = watcherFn;
module.exports.waitForFileNameContains = waitForFileNameContains;
module.exports.hasMatchFunctions = hasMatchFunctions;
