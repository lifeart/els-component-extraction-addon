"use strict";

const { TextEdit, Position, Command } = require("vscode-languageserver");
const { URI } = require("vscode-uri");
const {
  normalizeToAngleBracketComponent,
  waitForFileNameContains,
  watcherFn,
} = require("./utils");

module.exports = {
  onInit(_, project) {
    if (!("els.executeInEmberCLI" in project.executors)) {
      console.error('Unable to find "ember-fast-cli" addon.');
      return;
    }
    project.addWatcher(watcherFn);
    project.executors["els.extractSourceCodeToComponent"] = async (
      server,
      filePath,
      [rawComponentName, { range, source, uri }]
    ) => {
      if (!rawComponentName.trim()) {
        console.log("no component name found");
        return;
      }
      try {
        // const ast = server.templateCompletionProvider.getAST(document.getText(range));
        // const focusPath = server.templateCompletionProvider.createFocusPath(ast, ast.loc.start, text);
        const componentName = rawComponentName.trim().split(" ").pop();
        const waiter = waitForFileNameContains(componentName);
        await server.onExecute({
          command: "els.executeInEmberCLI",
          arguments: [filePath, `g component ${rawComponentName}`],
        });
        await waiter;
        const registry = server.getRegistry(project.root);
        if (!(componentName in registry.component)) {
          console.log(
            `Unable to find component ${componentName} in registry ${JSON.stringify(
              Object.keys(registry.component)
            )}`
          );
          return;
        }
        const fileName = registry["component"][componentName].find((file) =>
          file.endsWith(".hbs")
        );
        if (!fileName) {
          console.log(
            `Unable to find template file for component ${componentName}`
          );
          return;
        }
        const fileUri = URI.file(fileName).toString();
        const edit = {
          changes: {
            [uri]: [
              TextEdit.replace(
                range,
                `<${normalizeToAngleBracketComponent(componentName)} />`
              ),
            ],
            [fileUri]: [TextEdit.insert(Position.create(0, 0), source)],
          },
        };
        await server.connection.workspace.applyEdit(edit);
      } catch (e) {
        console.error(e);
      }
    };
  },

  onCodeAction(_, params) {
    if (!params.textDocument.uri.endsWith(".hbs")) {
      return;
    }
    const act = Command.create(
      "Extract selection to component",
      "els.getUserInput",
      {
        placeHolder: "Enter component name",
      },
      "els.extractSourceCodeToComponent",
      {
        source: params.document.getText(params.range),
        range: params.range,
        uri: params.textDocument.uri,
      }
    );
    return [act];
  },
};
