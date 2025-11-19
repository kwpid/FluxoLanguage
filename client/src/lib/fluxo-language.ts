import { loader } from "@monaco-editor/react";

export function registerFluxoLanguage() {
  loader.init().then((monaco) => {
    // Register Fluxo language
    monaco.languages.register({ id: 'fluxo' });

    // Set language configuration for auto-closing pairs and other editor features
    monaco.languages.setLanguageConfiguration('fluxo', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string'] }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      folding: {
        markers: {
          start: new RegExp('^\\s*//\\s*#?region\\b'),
          end: new RegExp('^\\s*//\\s*#?endregion\\b')
        }
      }
    });

    // Define syntax highlighting rules
    monaco.languages.setMonarchTokensProvider('fluxo', {
      keywords: [
        'module', 'export', 'import', 'from', 'require', 'function', 'return', 'if', 'else',
        'while', 'for', 'break', 'continue', 'local',
        'true', 'false', 'null', 'undefined'
      ],

      htmlElements: [
        'createButton', 'createDiv', 'createInput', 'createText', 'createImage',
        'createContainer', 'createForm', 'createHeading', 'createParagraph',
        'createLink', 'createList', 'createListItem', 'createSpan'
      ],

      eventHandlers: [
        'onClick', 'onHover', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
        'onKeyPress', 'onKeyDown', 'onKeyUp', 'onMouseEnter', 'onMouseLeave'
      ],

      operators: [
        '=', '>', '<', '!', ':', '+', '-', '*', '/', '%',
        '==', '!=', '<=', '>=', '&&', '||', '++', '--'
      ],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      tokenizer: {
        root: [
          // Identifiers and keywords
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@htmlElements': 'type',
              '@eventHandlers': 'function',
              '@default': 'identifier'
            }
          }],

          // Whitespace
          { include: '@whitespace' },

          // Delimiters and operators
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],

          // Delimiter: after number because of .\d floats
          [/[;,.]/, 'delimiter'],

          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
        ],

        whitespace: [
          [/[ \t\r\n]+/, ''],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        string_double: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],

        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ],
      },
    });

    // Define autocomplete suggestions
    monaco.languages.registerCompletionItemProvider('fluxo', {
      provideCompletionItems: async (model, position): Promise<any> => {
        let workspaceSymbols: { variables: string[], functions: string[] } = { variables: [], functions: [] };
        
        try {
          const response = await fetch('/api/workspace/symbols');
          if (response.ok) {
            workspaceSymbols = await response.json();
          }
        } catch (error) {
          console.error('Failed to fetch workspace symbols:', error);
        }

        // Parse current model for local variables and functions
        const currentCode = model.getValue();
        const localVariables = new Set<string>();
        const localFunctions = new Set<string>();
        
        // Extract function declarations: function name(...)
        const functionRegex = /function\s+([a-zA-Z_]\w*)\s*\(/g;
        let match;
        while ((match = functionRegex.exec(currentCode)) !== null) {
          localFunctions.add(match[1]);
        }
        
        // Extract local variable declarations: local name = ...
        const variableRegex = /local\s+([a-zA-Z_]\w*)\s*=/g;
        while ((match = variableRegex.exec(currentCode)) !== null) {
          localVariables.add(match[1]);
        }
        
        // Also extract simple variable assignments: name = ... (but not inside strings)
        const assignmentRegex = /(?:^|\n)\s*([a-zA-Z_]\w*)\s*=/g;
        while ((match = assignmentRegex.exec(currentCode)) !== null) {
          localVariables.add(match[1]);
        }

        const suggestions = [
          {
            label: 'module',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'module ${1:moduleName} {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Define a module',
          },
          {
            label: 'export function',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'export function ${1:functionName}(${2:params}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Export a function from a module',
          },
          {
            label: 'export {}',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'export {\n\t${1:variableName}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Export specific variables from a module',
          },
          {
            label: 'import from',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'import from "${1:modulePath}" { ${2:variable} }',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import specific variables/functions from a module',
          },
          {
            label: 'require',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'require("${1:path}")',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import a module',
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Define a function',
          },
          {
            label: 'createButton',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'createButton({ text: "${1:Button Text}" })',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an interactive button element (requires HTMLSupporter extension)',
          },
          {
            label: 'createDiv',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'createDiv({ class: "${1:container}" })',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a container div element (requires HTMLSupporter extension)',
          },
          {
            label: 'createInput',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'createInput({ type: "${1:text}", placeholder: "${2:Enter text}" })',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an input field (requires HTMLSupporter extension)',
          },
          {
            label: 'onClick',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'onClick(function() {\n\t$0\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a click event handler to an element (requires HTMLSupporter extension)',
          },
          {
            label: 'onChange',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'onChange(function(value) {\n\t$0\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a change event handler to an element (requires HTMLSupporter extension)',
          },
          {
            label: 'onHover',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'onHover(function() {\n\t$0\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a hover event handler to an element (requires HTMLSupporter extension)',
          },
          {
            label: 'selectElement',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'selectElement("${1:#selector}")',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Select an HTML element by CSS selector for manipulation',
          },
        ];

        // Add local functions (current file)
        localFunctions.forEach(funcName => {
          suggestions.push({
            label: funcName,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${funcName}($0)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: `Local function: ${funcName}`,
          } as any);
        });

        // Add local variables (current file)
        localVariables.forEach(varName => {
          suggestions.push({
            label: varName,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: varName,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.None,
            documentation: `Local variable: ${varName}`,
          } as any);
        });

        // Add workspace variables (other files)
        workspaceSymbols.variables.forEach(varName => {
          if (!localVariables.has(varName)) {
            suggestions.push({
              label: varName,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: varName,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.None,
              documentation: `Variable from workspace: ${varName}`,
            } as any);
          }
        });

        // Add workspace functions (other files)
        workspaceSymbols.functions.forEach(funcName => {
          if (!localFunctions.has(funcName)) {
            suggestions.push({
              label: funcName,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: `${funcName}($0)`,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: `Function from workspace: ${funcName}`,
            } as any);
          }
        });

        return { suggestions };
      },
    });

    // Set theme for Fluxo
    monaco.editor.defineTheme('fluxo-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C678DD', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'ABB2BF' },
        { token: 'string', foreground: '98C379' },
        { token: 'number', foreground: 'D19A66' },
        { token: 'operator', foreground: '56B6C2' },
        { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#1a1a1a',
      },
    });
  });
}
