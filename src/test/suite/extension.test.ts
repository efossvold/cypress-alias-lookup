import * as assert from "assert";
import * as vscode from "vscode";
import * as extension from "../../extension";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("extension should be loaded", () => {
    const extension = vscode.extensions.getExtension(
      "erikfossvold.cypress-alias-lookup"
    );

    if (typeof extension === "undefined") {
      assert.fail("extension is undefined");
      return;
    }

    assert.equal(extension.isActive, true);
  });

  suite("suggestions", () => {
    let document: vscode.TextDocument;

    async function setup(fileToOpen: string) {
      const file = await vscode.workspace.findFiles(`**/${fileToOpen}`);
      document = await vscode.workspace.openTextDocument(file[0]);
      await vscode.window.showTextDocument(document);
    }

    test.only("suggestion should be enabled", async () => {
      await setup("file1.ts");
      const pos = new vscode.Position(0, 12);
      const result = await vscode.commands.executeCommand(
        "vscode.executeCompletionItemProvider",
        document.uri,
        pos
      );
      const casted = result as vscode.CompletionList;
      assert.equal(casted.items.length, 3);
    });
  });
});
