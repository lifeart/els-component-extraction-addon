"use strict";

const { TextEdit, Position, Range, Command } = require("vscode-languageserver");
const fs = require("fs");
const { URI } = require("vscode-uri");
const {
  normalizeToAngleBracketComponent,
  waitForFileNameContains,
  watcherFn,
} = require("./utils");
const { transformSelection } = require("./transformers");
const { transformTests } = require("./testing-transformers");

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
        let rootRegistry = server.getRegistry(project.root);
        try {
          const helpers = Object.keys(rootRegistry["helper"]);
          const components = Object.keys(rootRegistry["component"]);
          const modifiers = Object.keys(rootRegistry["modifier"]);
          result = transformSelection(
            source,
            [].concat(helpers, components, modifiers)
          );
        } catch (e) {
          console.log(e.toString());
        }
        let { code, args } = result;
        let argNames = args
          .slice(0)
          .map((el) => el.split("=")[0].replace("@", ""));

        if (args.length) {
          args = "  " + args.join("\n  ");
          args = `  \n${args} \n`;
        } else {
          args = "";
        }

        const componentName = rawComponentName.trim().split(" ").pop();
        const tagName = normalizeToAngleBracketComponent(componentName);
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
        const componentRegistry = registry["component"][componentName];
        const fileName = componentRegistry.find((file) =>
          file.endsWith(".hbs")
        );
        const testFileName = componentRegistry.find(
          (file) => file.includes("test") && file.endsWith(".js")
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
            [uri]: [TextEdit.replace(range, `<${tagName} ${args}/>`)],
            [fileUri]: [
              TextEdit.replace(
                Range.create(
                  Position.create(0, 0),
                  Position.create(0, code.length)
                ),
                code
              ),
            ],
          },
        };
        if (testFileName) {
          try {
            const testContent = fs.readFileSync(testFileName, "utf8");
            const newTestContent = transformTests(
              testContent,
              tagName,
              argNames
            );
            edit.changes[URI.file(testFileName).toString()] = [
              TextEdit.replace(
                Range.create(
                  Position.create(0, 0),
                  Position.create(
                    testContent.split("\n").length,
                    testContent.length
                  )
                ),
                newTestContent
              ),
            ];
          } catch (e) {
            console.log(e.toString());
          }
        }
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
