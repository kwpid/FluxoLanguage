# Fluxo Common Issues - Quick Fix Guide

## Issue 1: Functions Not Printing Output

### Problem
```fluxo
local app = "AppName"

function checkApp() {
  return app
}

function checkApp2() {
  console.log(app)
}
```
**Nothing prints!** You only defined the functions but didn't call them.

### Solution
You need to **actually call** the functions:

```fluxo
local app = "AppName"

function checkApp() {
  return app
}

function checkApp2() {
  console.log(app)
}

// Call the functions to execute them
checkApp2()  // This will print "AppName"

local result = checkApp()
console.log("Result:", result)  // This will print "Result: AppName"
```

### Key Rule
**Defining a function ≠ Running a function**
- `function myFunc() { }` → just creates it
- `myFunc()` → actually runs it

---

## Issue 2: Import Autocomplete Not Working

### Problem
When you type `import from "module" { }` the editor doesn't suggest available functions/variables.

### Solution
The autocomplete now works! After the latest update:

1. **Type the import statement with the module path first:**
   ```fluxo
   import from "modules/myModule" { 
   ```

2. **Press `Ctrl+Space` inside the curly braces** to see available exports

3. **Autocomplete will show:**
   - Exported functions from that module
   - Exported variables from that module

### Tips
- Make sure the module file exists at the path you specified
- Module files should have a `.fxm` extension
- The module must export something using `export function` or `export { }`

---

## Common Fluxo Patterns

### Defining and Using Variables
```fluxo
local myVar = "Hello"
console.log(myVar)  // Prints: Hello
```

### Defining and Calling Functions
```fluxo
function greet(name) {
  return "Hello, " + name
}

local message = greet("World")
console.log(message)  // Prints: Hello, World
```

### Creating a Module (.fxm file)
```fluxo
module mathUtils {
  export function add(a, b) {
    return a + b
  }
  
  export function multiply(a, b) {
    return a * b
  }
}
```

### Importing from a Module
```fluxo
import from "modules/mathUtils" { add, multiply }

local sum = add(5, 3)
console.log("Sum:", sum)  // Prints: Sum: 8
```

---

## Debugging Checklist

When your code doesn't work:

1. ✅ **Did you call the function?**
   - Just defining it won't make it run

2. ✅ **Is your syntax correct?**
   - Variables: `local name = value`
   - Functions: `function name() { }`

3. ✅ **Are you checking the output panel?**
   - Click "Run" to see console.log output
   - Check the output section below the editor

4. ✅ **For imports, does the module exist?**
   - Check the file path is correct
   - Verify the module has exports

---

## Need More Help?

- Check `README.fxo` for language syntax reference
- Check `HTMLSUPPORTER_EXAMPLE.md` for HTML element examples
- Use autocomplete (`Ctrl+Space`) to see available functions
