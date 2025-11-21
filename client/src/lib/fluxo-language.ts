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
        
        // Check if we're inside an import statement
        const lineContent = model.getLineContent(position.lineNumber);
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        
        // Detect if we're typing inside import from "..." { }
        const importMatch = textUntilPosition.match(/import\s+from\s+"([^"]+)"\s*\{\s*([^}]*)$/);
        const es6ImportMatch = textUntilPosition.match(/import\s*\{\s*([^}]*)$/);
        
        if (importMatch || es6ImportMatch) {
          // We're inside an import statement - suggest available exports from the module
          let modulePath = importMatch ? importMatch[1] : null;
          
          if (modulePath) {
            try {
              const fullPath = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
              const moduleFilePath = fullPath.endsWith('.fxm') ? fullPath : `${fullPath}.fxm`;
              
              const response = await fetch(`/api/files${moduleFilePath}`);
              if (response.ok) {
                const fileData = await response.json();
                const moduleContent = fileData.content;
                
                const exportSuggestions: any[] = [];
                
                // Extract export function declarations
                const exportFuncRegex = /export\s+function\s+([a-zA-Z_]\w*)\s*\(/g;
                let match;
                while ((match = exportFuncRegex.exec(moduleContent)) !== null) {
                  exportSuggestions.push({
                    label: match[1],
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: match[1],
                    documentation: `Exported function from ${modulePath}`,
                  });
                }
                
                // Extract export { } block
                const exportBlockMatch = moduleContent.match(/export\s*\{([^}]+)\}/);
                if (exportBlockMatch) {
                  const exports = exportBlockMatch[1].split(',').map((e: string) => e.trim()).filter((e: string) => e);
                  exports.forEach((exportName: string) => {
                    exportSuggestions.push({
                      label: exportName,
                      kind: monaco.languages.CompletionItemKind.Variable,
                      insertText: exportName,
                      documentation: `Exported from ${modulePath}`,
                    });
                  });
                }
                
                return { suggestions: exportSuggestions };
              }
            } catch (error) {
              console.error('Failed to fetch module exports:', error);
            }
          }
          
          // Fallback: show workspace symbols
          const importSuggestions: any[] = [];
          workspaceSymbols.functions.forEach(funcName => {
            importSuggestions.push({
              label: funcName,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: funcName,
              documentation: 'Function from workspace',
            });
          });
          workspaceSymbols.variables.forEach(varName => {
            importSuggestions.push({
              label: varName,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: varName,
              documentation: 'Variable from workspace',
            });
          });
          return { suggestions: importSuggestions };
        }
        
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
            documentation: 'Selectively import specific variables/functions from a module',
          },
          {
            label: 'import (all exports)',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'import ${1:identifier} "${2:modulePath}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import all exports from a module as an object',
          },
          {
            label: 'import()',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'import("${1:modulePath}")',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import an entire module (access via module name)',
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
          {
            label: 'console.log',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'console.log($0)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Print messages to the console for debugging',
          },
          {
            label: 'wait',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'wait(${1:seconds}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Pause execution for specified seconds, then execute the code block',
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

    // Register code validation and diagnostics
    function validateCode(model: any): any[] {
      const markers: any[] = [];
      const code = model.getValue();
      const lines = code.split('\n');

      // Track cumulative balances for multi-line validation
      let parenBalance = 0;
      let bracketBalance = 0;
      let braceBalance = 0;

      lines.forEach((line: string, lineIndex: number) => {
        const lineNumber = lineIndex + 1;
        const trimmedLine = line.trim();

        // Skip comments for string validation
        const isComment = trimmedLine.startsWith('//');

        // Check for unclosed strings (only on lines that aren't comments)
        if (!isComment) {
          const singleQuotes = (line.match(/'/g) || []).length;
          const doubleQuotes = (line.match(/"/g) || []).length;
          
          if (singleQuotes % 2 !== 0) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: lineNumber,
              startColumn: 1,
              endLineNumber: lineNumber,
              endColumn: line.length + 1,
              message: 'Unclosed string - missing closing single quote',
            });
          }
          
          if (doubleQuotes % 2 !== 0) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: lineNumber,
              startColumn: 1,
              endLineNumber: lineNumber,
              endColumn: line.length + 1,
              message: 'Unclosed string - missing closing double quote',
            });
          }
        }

        // Track cumulative balance across the document
        if (!isComment) {
          parenBalance += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
          bracketBalance += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
          braceBalance += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        }

        // Check for function syntax errors
        if (trimmedLine.startsWith('function') && !trimmedLine.includes('(')) {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: line.length + 1,
            message: 'Invalid function declaration - missing parentheses',
          });
        }

        // Check for missing semicolons on assignment/declaration lines (optional but helpful)
        if ((trimmedLine.includes('local ') || /^[a-zA-Z_]\w*\s*=/.test(trimmedLine)) 
            && !trimmedLine.endsWith(';') 
            && !trimmedLine.endsWith('{')
            && !trimmedLine.endsWith('}')
            && trimmedLine.length > 0
            && !trimmedLine.startsWith('//')) {
          markers.push({
            severity: monaco.MarkerSeverity.Info,
            startLineNumber: lineNumber,
            startColumn: line.length,
            endLineNumber: lineNumber,
            endColumn: line.length + 1,
            message: 'Consider adding a semicolon',
          });
        }

        // Check for undefined variables being used (basic check)
        const assignmentMatch = trimmedLine.match(/^([a-zA-Z_]\w*)\s*=/);
        if (assignmentMatch && !trimmedLine.includes('local ') && !trimmedLine.includes('function')) {
          const varName = assignmentMatch[1];
          const keywords = ['module', 'export', 'import', 'from', 'require', 'function', 'return', 'if', 'else', 'while', 'for', 'break', 'continue', 'local', 'true', 'false', 'null', 'undefined'];
          
          if (!keywords.includes(varName)) {
            const hasLocalDeclaration = code.includes(`local ${varName}`);
            if (!hasLocalDeclaration) {
              markers.push({
                severity: monaco.MarkerSeverity.Hint,
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: varName.length + 1,
                message: `Variable '${varName}' is not declared with 'local' - consider using 'local ${varName} =' for better scoping`,
              });
            }
          }
        }
      });

      // Check cumulative balances at the end of the document
      const lastLineNumber = lines.length;
      
      if (parenBalance > 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: lastLineNumber,
          startColumn: 1,
          endLineNumber: lastLineNumber,
          endColumn: lines[lastLineNumber - 1]?.length + 1 || 1,
          message: `Missing ${parenBalance} closing parenthesis(es)`,
        });
      } else if (parenBalance < 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: `Extra ${Math.abs(parenBalance)} closing parenthesis(es)`,
        });
      }

      if (bracketBalance > 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: lastLineNumber,
          startColumn: 1,
          endLineNumber: lastLineNumber,
          endColumn: lines[lastLineNumber - 1]?.length + 1 || 1,
          message: `Missing ${bracketBalance} closing bracket(s)`,
        });
      } else if (bracketBalance < 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: `Extra ${Math.abs(bracketBalance)} closing bracket(s)`,
        });
      }

      if (braceBalance > 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: lastLineNumber,
          startColumn: 1,
          endLineNumber: lastLineNumber,
          endColumn: lines[lastLineNumber - 1]?.length + 1 || 1,
          message: `Missing ${braceBalance} closing brace(s)`,
        });
      } else if (braceBalance < 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: `Extra ${Math.abs(braceBalance)} closing brace(s)`,
        });
      }

      return markers;
    }

    // Add onChange listener to validate code as it's typed
    monaco.editor.onDidCreateModel((model) => {
      if (model.getLanguageId() === 'fluxo') {
        // Validate immediately
        const markers = validateCode(model);
        monaco.editor.setModelMarkers(model, 'fluxo', markers);

        // Validate on content change
        model.onDidChangeContent(() => {
          const markers = validateCode(model);
          monaco.editor.setModelMarkers(model, 'fluxo', markers);
        });
      }
    });

    // Register hover provider for helpful information
    monaco.languages.registerHoverProvider('fluxo', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const helpTexts: Record<string, string> = {
          'module': 'Defines a reusable module that can export functions and variables',
          'export': 'Exports functions or variables from a module for use in other files',
          'import': 'Imports functions or variables from another module',
          'function': 'Declares a reusable function that can accept parameters and return values',
          'local': 'Declares a variable with local scope (recommended for all variables)',
          'createButton': 'Creates an interactive button element (requires HTMLSupporter extension)',
          'createDiv': 'Creates a container div element (requires HTMLSupporter extension)',
          'createInput': 'Creates an input field (requires HTMLSupporter extension)',
          'onClick': 'Adds a click event handler to an element (requires HTMLSupporter extension)',
          'onChange': 'Adds a change event handler (requires HTMLSupporter extension)',
          'console.log': 'Prints debug messages to the console',
          'wait': 'Pauses execution for the specified number of seconds',
        };

        const hoverText = helpTexts[word.word];
        if (hoverText) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: [
              { value: `**${word.word}**` },
              { value: hoverText }
            ]
          };
        }

        return null;
      }
    });

    // Register code formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('fluxo', {
      provideDocumentFormattingEdits: (model) => {
        const code = model.getValue();
        const lines = code.split('\n');
        let indentLevel = 0;
        const formattedLines: string[] = [];

        lines.forEach((line) => {
          const trimmed = line.trim();
          
          // Decrease indent for closing braces
          if (trimmed.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          // Add the line with proper indentation
          const indent = '  '.repeat(indentLevel);
          formattedLines.push(indent + trimmed);

          // Increase indent for opening braces
          if (trimmed.endsWith('{')) {
            indentLevel++;
          }
        });

        const formatted = formattedLines.join('\n');
        
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          }
        ];
      }
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
