import * as vscode from "vscode";

const { workspace } = vscode;
const extensions = "*.{spec,test}.{js,jsx,ts,tsx}";
const cfg = workspace.getConfiguration("cypressAliasLookup");
const aliases: string[] = cfg.get("aliases") || [];
const asSuggestions: string[] = cfg.get("asSuggestions") || [];
const regex = /(?<=\.as\(["'])(.*?)(?=["']\))/g;
const content: Record<string, string[]> = {};

export async function activate(context: vscode.ExtensionContext) {
  const languages = [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
  ];

  languages.forEach((language) => {
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        language,
        { provideCompletionItems: provideGetAsCompletionItems },
        "'"
      )
    );
  });

  languages.forEach((language) => {
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        language,
        { provideCompletionItems: provideAsCompletionItems },
        "'"
      )
    );
  });

  setupFileWatchers();
  findMatchesInFiles();
}

const setupFileWatchers = () => {
  const watcher = workspace.createFileSystemWatcher(`**/${extensions}`);
  watcher.onDidCreate(findMatchesInFiles);
  watcher.onDidChange(findMatchesInFiles);
  watcher.onDidDelete((uri) => {
    delete content[uri.path];
  });
};

const findMatchesInText = (text: string) =>
  [...text.matchAll(regex)].map((match) => `@${match[0]}`);

const findMatchesInFile = async (uri: vscode.Uri) =>
  workspace.fs.readFile(uri).then((buffer) => {
    const text = buffer.toString();
    content[uri.path] = findMatchesInText(text);
  });

const findFiles = async () => {
  const includes = [...(cfg.get("include") as string[])];
  const includeCurrentFileDir = cfg.get("includeCurrentFileDir");

  if (includeCurrentFileDir) {
    includes.push(extensions);
  }

  try {
    const results = await Promise.all(
      includes.map((pattern) =>
        workspace.findFiles(pattern, "**​/node_modules/**")
      )
    );
    return results.flat();
  } catch (err) {
    console.error(err);
  }

  return [];
};

const findMatchesInFiles = async () => {
  try {
    const files = await findFiles();
    await Promise.all(files.map((uri) => findMatchesInFile(uri)));
  } catch (err) {
    console.error(err);
  }
};

const unique = (strings: string[]) => [...new Set(strings)];

const provideGetAsCompletionItems = async (
  document: vscode.TextDocument,
  position: vscode.Position
) => {
  const linePrefix = document
    .lineAt(position)
    .text.substr(0, position.character);

  if (!linePrefix.endsWith("cy.getAs('")) {
    return undefined;
  }

  const documentMatches = findMatchesInText(document.getText());
  const matches = unique([
    ...Object.values(content).flat(),
    ...documentMatches,
    ...aliases.map((as) => `@${as}`),
  ]).sort();

  return matches.map(
    (value) =>
      new vscode.CompletionItem(value, vscode.CompletionItemKind.Method)
  );
};

const provideAsCompletionItems = async (
  document: vscode.TextDocument,
  position: vscode.Position
) => {
  const linePrefix = document
    .lineAt(position)
    .text.substr(0, position.character);

  if (!linePrefix.endsWith(".as('")) {
    return undefined;
  }

  const suggestion = linePrefix
    .replace("})", "")
    .replace(".as('", "")
    .replace(".stub()", "")
    .replace("const ", "")
    .replace("let ", "")
    .trim();

  const suggestions = [...asSuggestions];

  if (suggestion !== "") {
    suggestions.push(suggestion);
  }

  return suggestions
    .map(
      (value) =>
        new vscode.CompletionItem(value, vscode.CompletionItemKind.Method)
    )
    .sort();
};
