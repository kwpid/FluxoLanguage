// Fluxo Browser Runtime
// This runtime executes Fluxo code in the browser context

(function() {
  'use strict';

  // Module registry for loaded Fluxo modules
  const moduleRegistry = new Map(); // path -> { exports, executed }
  const pendingModules = new Map(); // path -> Promise
  
  // Current directory for path resolution (set when loading entry scripts)
  let currentDirectory = '';

  // Global context for Fluxo variables and functions
  const fluxoContext = {
    variables: {},
    functions: {},
    modules: {}
  };

  // Console implementation
  window.console = window.console || {};
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  // Wait function (like Lua's wait)
  window.wait = function(seconds) {
    return new Promise(function(resolve) {
      setTimeout(resolve, seconds * 1000);
    });
  };

  // Helper function to get or create an element
  function getElement(selector) {
    if (typeof selector === 'object' && selector.element) {
      return selector.element;
    }
    return document.querySelector(selector);
  }

  // DOM Creation Functions
  window.createButton = function(config) {
    const button = document.createElement('button');
    if (config) {
      if (config.text) button.textContent = config.text;
      if (config.id) button.id = config.id;
      if (config.class) button.className = config.class;
      if (config.style) Object.assign(button.style, config.style);
    }
    
    const wrapper = {
      element: button,
      onClick: function(handler) {
        button.addEventListener('click', handler);
        return wrapper;
      },
      setText: function(text) {
        button.textContent = text;
        return wrapper;
      },
      setStyle: function(styles) {
        Object.assign(button.style, styles);
        return wrapper;
      }
    };
    
    return wrapper;
  };

  window.createDiv = function(config) {
    const div = document.createElement('div');
    if (config) {
      if (config.text) div.textContent = config.text;
      if (config.id) div.id = config.id;
      if (config.class) div.className = config.class;
      if (config.style) Object.assign(div.style, config.style);
    }
    
    const wrapper = {
      element: div,
      onClick: function(handler) {
        div.addEventListener('click', handler);
        return wrapper;
      },
      onHover: function(handler) {
        div.addEventListener('mouseenter', handler);
        return wrapper;
      },
      setText: function(text) {
        div.textContent = text;
        return wrapper;
      },
      setHTML: function(html) {
        div.innerHTML = html;
        return wrapper;
      },
      setStyle: function(styles) {
        Object.assign(div.style, styles);
        return wrapper;
      }
    };
    
    return wrapper;
  };

  window.createInput = function(config) {
    const input = document.createElement('input');
    if (config) {
      if (config.type) input.type = config.type;
      if (config.placeholder) input.placeholder = config.placeholder;
      if (config.value) input.value = config.value;
      if (config.id) input.id = config.id;
      if (config.class) input.className = config.class;
      if (config.style) Object.assign(input.style, config.style);
    }
    
    const wrapper = {
      element: input,
      onChange: function(handler) {
        input.addEventListener('input', function() {
          handler(input.value);
        });
        return wrapper;
      },
      onFocus: function(handler) {
        input.addEventListener('focus', handler);
        return wrapper;
      },
      onBlur: function(handler) {
        input.addEventListener('blur', handler);
        return wrapper;
      },
      setValue: function(value) {
        input.value = value;
        return wrapper;
      },
      getValue: function() {
        return input.value;
      }
    };
    
    return wrapper;
  };

  window.createText = function(text) {
    return document.createTextNode(text);
  };

  window.createHeading = function(config) {
    const level = (config && config.level) || 1;
    const heading = document.createElement('h' + level);
    if (config) {
      if (config.text) heading.textContent = config.text;
      if (config.id) heading.id = config.id;
      if (config.class) heading.className = config.class;
      if (config.style) Object.assign(heading.style, config.style);
    }
    return heading;
  };

  window.createParagraph = function(config) {
    const p = document.createElement('p');
    if (config) {
      if (config.text) p.textContent = config.text;
      if (config.id) p.id = config.id;
      if (config.class) p.className = config.class;
      if (config.style) Object.assign(p.style, config.style);
    }
    return p;
  };

  // DOM Selection and Manipulation
  window.select = function(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn('Element not found:', selector);
      return null;
    }
    
    return {
      element: element,
      onClick: function(handler) {
        element.addEventListener('click', handler);
        return this;
      },
      onChange: function(handler) {
        element.addEventListener('input', function() {
          handler(element.value);
        });
        return this;
      },
      onHover: function(handler) {
        element.addEventListener('mouseenter', handler);
        return this;
      },
      setText: function(text) {
        element.textContent = text;
        return this;
      },
      setHTML: function(html) {
        element.innerHTML = html;
        return this;
      },
      setStyle: function(styles) {
        Object.assign(element.style, styles);
        return this;
      },
      getValue: function() {
        return element.value;
      },
      setValue: function(value) {
        element.value = value;
        return this;
      },
      addClass: function(className) {
        element.classList.add(className);
        return this;
      },
      removeClass: function(className) {
        element.classList.remove(className);
        return this;
      },
      toggleClass: function(className) {
        element.classList.toggle(className);
        return this;
      }
    };
  };

  // Normalize module path (resolve relative paths)
  function normalizePath(path, basePath) {
    // If path is absolute, return as-is
    if (path.startsWith('/')) {
      return path;
    }
    
    // Resolve relative path
    const baseDir = basePath.substring(0, basePath.lastIndexOf('/')) || '';
    let resolved = baseDir ? baseDir + '/' + path : path;
    
    // Simplify path (remove ./ and ../)
    const parts = resolved.split('/');
    const normalized = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '.' || parts[i] === '') continue;
      if (parts[i] === '..') {
        normalized.pop();
      } else {
        normalized.push(parts[i]);
      }
    }
    
    return '/' + normalized.join('/');
  }

  // Require function for loading modules
  function createRequire(basePath) {
    return function require(modulePath) {
      const resolvedPath = normalizePath(modulePath, basePath);
      
      // Check if module is already loaded
      const cached = moduleRegistry.get(resolvedPath);
      if (cached && cached.executed) {
        return cached.exports;
      }
      
      // Module not loaded yet - this is a synchronous call in a module system
      // that needs async loading. For now, return empty object and log warning.
      console.warn('Module not preloaded:', resolvedPath);
      console.warn('Make sure to await loadModule() before calling require()');
      return {};
    };
  }

  // Load a module asynchronously
  function loadModule(modulePath, basePath) {
    const resolvedPath = normalizePath(modulePath, basePath || currentDirectory);
    
    // Check if already loaded
    if (moduleRegistry.has(resolvedPath)) {
      return Promise.resolve(moduleRegistry.get(resolvedPath).exports);
    }
    
    // Check if loading is in progress
    if (pendingModules.has(resolvedPath)) {
      return pendingModules.get(resolvedPath);
    }
    
    // Pre-populate registry to prevent duplicate work
    moduleRegistry.set(resolvedPath, {
      exports: {},
      executed: false
    });
    
    // Start loading
    const promise = new Promise(function(resolve, reject) {
      async function handleModuleResponse(event) {
        // Parent sends back with normalized path
        if (event.data && 
            event.data.type === 'fluxo-module' && 
            event.data.path === resolvedPath) {
          window.removeEventListener('message', handleModuleResponse);
          
          try {
            const moduleExports = await executeModule(event.data.code, resolvedPath);
            // Get the registry entry after execution to ensure we have the executed flag
            const registryEntry = moduleRegistry.get(resolvedPath);
            if (registryEntry) {
              resolve(registryEntry.exports);
            } else {
              resolve(moduleExports);
            }
          } catch (error) {
            console.error('Failed to execute module', resolvedPath, error);
            // Remove from registry on failure
            moduleRegistry.delete(resolvedPath);
            reject(error);
          }
        }
      }
      
      window.addEventListener('message', handleModuleResponse);
      
      // Request module from parent with RESOLVED path
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'fluxo-load-module',
          path: resolvedPath // Send normalized path
        }, '*');
      } else {
        moduleRegistry.delete(resolvedPath);
        reject(new Error('Cannot load module: no parent window'));
      }
      
      // Timeout after 5 seconds
      setTimeout(function() {
        window.removeEventListener('message', handleModuleResponse);
        moduleRegistry.delete(resolvedPath);
        reject(new Error('Module load timeout: ' + resolvedPath));
      }, 5000);
    });
    
    pendingModules.set(resolvedPath, promise);
    promise.finally(function() {
      pendingModules.delete(resolvedPath);
    });
    
    return promise;
  }

  // Execute a module and return its exports
  async function executeModule(code, modulePath) {
    // Create module object
    const module = { exports: {} };
    const moduleExports = module.exports;
    const require = createRequire(modulePath);
    
    try {
      // Transpile Fluxo to JavaScript
      const jsCode = transpileFluxoToJS(code);
      
      // Get AsyncFunction constructor to support await in Fluxo code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      
      // Execute in sandboxed context with require, module, exports
      const moduleFunction = new AsyncFunction(
        'require', 'module', 'exports', 'console', 'select', 
        'createButton', 'createDiv', 'createInput', 'createText', 
        'createHeading', 'createParagraph', 'wait',
        jsCode
      );
      
      await moduleFunction(
        require, module, moduleExports, console, 
        window.select, window.createButton, window.createDiv, 
        window.createInput, window.createText, window.createHeading, 
        window.createParagraph, window.wait
      );
      
      // Store in registry
      moduleRegistry.set(modulePath, {
        exports: module.exports,
        executed: true
      });
      
      return module.exports;
    } catch (error) {
      console.error('Module execution error:', modulePath, error);
      throw error;
    }
  }

  // Simple Fluxo to JavaScript transpiler
  function transpileFluxoToJS(fluxoCode) {
    let jsCode = fluxoCode;
    
    // Remove comments
    jsCode = jsCode.replace(/\/\/.*$/gm, '');
    jsCode = jsCode.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Convert wait(seconds) { block } to await wait(seconds); block
    // This matches wait with a callback-style block and converts it to async/await
    jsCode = jsCode.replace(/wait\s*\(([^)]+)\)\s*\{/g, function(match, seconds) {
      return 'await wait(' + seconds + ');\n';
    });
    
    // Convert local to var/let
    jsCode = jsCode.replace(/\blocal\s+/g, 'let ');
    
    // Convert module and export keywords
    jsCode = jsCode.replace(/\bmodule\s+.*?\n/g, '');
    
    // Handle import statements - convert to require calls
    // import { thing } from "./module.fxm" -> const { thing } = require("./module.fxm")
    jsCode = jsCode.replace(/\bimport\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/g, 'const {$1} = require("$2")');
    // import thing from "./module.fxm" -> const thing = require("./module.fxm")
    jsCode = jsCode.replace(/\bimport\s+(\w+)\s+from\s+["']([^"']+)["']/g, 'const $1 = require("$2")');
    // import * as thing from "./module.fxm" -> const thing = require("./module.fxm")
    jsCode = jsCode.replace(/\bimport\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g, 'const $1 = require("$2")');
    
    // Keep export statements but make them work with module.exports
    jsCode = jsCode.replace(/\bexport\s+(function\s+\w+)/g, 'module.exports.$1 = $1;');
    jsCode = jsCode.replace(/\bexport\s+(const|let|var)\s+(\w+)/g, function(match, keyword, varName) {
      return keyword + ' ' + varName;
    });
    
    // Handle export { thing } syntax
    jsCode = jsCode.replace(/\bexport\s+\{([^}]+)\}/g, function(match, exports) {
      const exportList = exports.split(',').map(function(e) { return e.trim(); });
      return exportList.map(function(exp) {
        return 'module.exports.' + exp + ' = ' + exp + ';';
      }).join('\n');
    });
    
    return jsCode;
  }

  // Execute Fluxo code immediately (for inline scripts)
  window.executeFluxo = async function(code) {
    try {
      const jsCode = transpileFluxoToJS(code);
      // Get AsyncFunction constructor to support await in Fluxo code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const func = new AsyncFunction(
        'console', 'select', 'createButton', 'createDiv', 'createInput', 
        'createText', 'createHeading', 'createParagraph', 'wait',
        jsCode
      );
      await func(
        console, window.select, window.createButton, window.createDiv, 
        window.createInput, window.createText, window.createHeading, 
        window.createParagraph, window.wait
      );
    } catch (error) {
      console.error('Fluxo execution error:', error);
    }
  };

  // Load Fluxo scripts from data-fluxo-entry attributes and data-fluxo-code scripts
  async function loadFluxoScripts() {
    // Load external entry modules first
    const entryScripts = document.querySelectorAll('script[data-fluxo-entry]');
    const entryFiles = Array.from(entryScripts).map(s => s.getAttribute('data-fluxo-entry'));
    
    if (entryFiles.length > 0) {
      console.log('Loading Fluxo entry modules:', entryFiles);
      
      for (const entryFile of entryFiles) {
        try {
          await loadModule(entryFile, '');
          console.log('✓ Loaded:', entryFile);
        } catch (error) {
          console.error('✗ Failed to load:', entryFile, error);
        }
      }
    }
    
    // Execute inline Fluxo code from data-fluxo-code scripts
    const inlineScripts = document.querySelectorAll('script[data-fluxo-code]');
    
    if (inlineScripts.length > 0) {
      console.log('Executing inline Fluxo scripts:', inlineScripts.length);
      
      for (const script of inlineScripts) {
        let fluxoCode = script.textContent;
        if (fluxoCode && fluxoCode.trim()) {
          try {
            // Decode HTML entities (for code that was HTML-escaped)
            const textarea = document.createElement('textarea');
            textarea.innerHTML = fluxoCode;
            fluxoCode = textarea.value;
            
            window.executeFluxo(fluxoCode);
            console.log('✓ Executed inline Fluxo code');
          } catch (error) {
            console.error('✗ Failed to execute inline Fluxo code:', error);
          }
        }
      }
    }
    
    if (entryFiles.length === 0 && inlineScripts.length === 0) {
      console.log('No Fluxo scripts found');
    } else {
      console.log('All Fluxo modules loaded');
    }
  }

  // Listen for Fluxo code from parent window (for direct execution)
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'fluxo-execute') {
      window.executeFluxo(event.data.code);
    }
  });

  // Auto-load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFluxoScripts);
  } else {
    // DOM is already ready, load scripts after a small delay to ensure iframe is ready
    setTimeout(loadFluxoScripts, 100);
  }

  // Expose loadModule for external use
  window.loadFluxoModule = loadModule;

  console.log('✓ Fluxo runtime loaded');
})();
