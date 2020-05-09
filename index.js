"use strict";

const { TextEdit, Position } =  require('vscode-languageserver');
const { URI } =  require('vscode-uri');

function normalizeToAngleBracketComponent(name) {
  const SIMPLE_DASHERIZE_REGEXP = /[a-z]|\/|-/g;
  const ALPHA = /[A-Za-z0-9]/;

  if (name.includes('.')) {
    return name;
  }

  return name.replace(SIMPLE_DASHERIZE_REGEXP, (char, index) => {
    if (char === '/') {
      return '::';
    }

    if (index === 0 || !ALPHA.test(name[index - 1])) {
      return char.toUpperCase();
    }

    // Remove all occurrences of '-'s from the name that aren't starting with `-`
    return char === '-' ? '' : char.toLowerCase();
  });
}

module.exports = {
  onInit(_, project) {

    project.executors['els.extractSourceCodeToComponent'] = async (server, filePath, [componentName, { range, source, uri }]) => {
      try {
        // const ast = server.templateCompletionProvider.getAST(document.getText(range));
        // const focusPath = server.templateCompletionProvider.createFocusPath(ast, ast.loc.start, text);
        await server.onExecute({
          command: 'els.executeInEmberCLI',
          arguments: [filePath, `g component ${componentName}`]
        });
        // going to wait for file changes api
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const registry = server.getRegistry(project.root);
        if (!(componentName in registry.component)) {
          console.log(`Unable to find component ${componentName} in registry ${JSON.stringify(registry.component)}`);
          return;
        }
        const fileName = registry['component'][componentName].find((file) => file.endsWith('.hbs'));
        if (!fileName) {
          console.log(`Unable to find template file for component ${componentName}`);
          return;
        }
        const fileUri = URI.file(fileName).toString();
        const edit = {
          changes: {
            [uri]: [TextEdit.replace(range, `<${normalizeToAngleBracketComponent(componentName)} />`)],
            [fileUri]: [TextEdit.insert(Position.create(0, 0), source)]
          }
        };
        await server.connection.workspace.applyEdit(edit);
      } catch (e) {
        logError(e);
      }
    };
  }
};
