"use strict";

const { TextEdit, Position, Range, Command } = require("vscode-languageserver");
const { URI } = require("vscode-uri");
const {
  normalizeToAngleBracketComponent,
  waitForFileNameContains,
  watcherFn,
} = require("./utils");
const { transformSelection } = require("./transformers");

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
        let result = {
          code: source,
          args: [],
        };
        try {
          const helpers = Object.keys(server.getRegistry(project.root)['helper']);
          result = transformSelection(source, helpers);
        } catch (e) {
          console.log(e.toString());
        }
        let { code, args } = result;

        if (args.length) {
          args = "  " + args.join("\n  ");
          args = `  \n${args} \n`;
        } else {
          args = "";
        }

        const componentName = rawComponentName.trim().split(" ").pop();
        const waiter = waitForFileNameContains(componentName);

        await server.onExecute({
          command: "els.executeInEmberCLI",
          arguments: [filePath, `g component ${rawComponentName}`],
        });
        try {
          await waiter;
        } catch (e) {
          console.log("unable to find document change event");
        }
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
                `<${normalizeToAngleBracketComponent(componentName)} ${args}/>`
              ),
            ],
            [fileUri]: [TextEdit.replace(Range.create(Position.create(0, 0), Position.create(0, code.length)), code)],
          },
        };
        await server.connection.workspace.applyEdit(edit);
      } catch (e) {
        console.log(e.toString());
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
