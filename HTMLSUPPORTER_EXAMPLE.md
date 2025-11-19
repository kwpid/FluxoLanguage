# HTMLSupporter Extension - Usage Guide

The HTMLSupporter extension allows you to preview and interact with Fluxo code directly in the browser, creating dynamic UI elements with full event handling support.

## Enabling HTMLSupporter

1. Click the **Extensions** icon in the IDE toolbar
2. Find **HTMLSupporter** in the available extensions list
3. Click **"Enable"** to activate the extension
4. The Preview tab will now work with `.fxo` and `.fxm` files (not just `.html` files)

## How It Works

When enabled, HTMLSupporter:
- Wraps your Fluxo code in an HTML document
- Injects the Fluxo runtime for browser execution
- Allows you to create and manipulate DOM elements
- Supports event handling (click, hover, input changes, etc.)

## Basic Example: Interactive Button

Create a file `button-demo.fxo` with this code:

```fluxo
// Create a button that changes text when clicked
local clickCount = 0

local btn = createButton({
  text: "Click me!",
  class: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
})

btn.onClick(function() {
  clickCount = clickCount + 1
  local newText = "Clicked " + clickCount + " times"
  btn.setText(newText)
})

// Add button to the page
select("body").append(btn.element)
```

**What this does:**
1. Creates a counter variable
2. Creates a styled button
3. Adds a click handler that:
   - Increments the counter
   - Concatenates a new message with the count
   - Updates the button text

## Example: Form with Input

Create `form-demo.fxo`:

```fluxo
// Create a greeting form
local nameInput = createInput({
  type: "text",
  placeholder: "Enter your name",
  class: "border px-3 py-2 rounded"
})

local greetBtn = createButton({
  text: "Greet Me",
  class: "ml-2 px-4 py-2 bg-green-500 text-white rounded"
})

local output = createDiv({
  class: "mt-4 text-lg font-bold"
})

greetBtn.onClick(function() {
  local name = nameInput.element.value
  local greeting = "Hello, " + name + "!"
  output.setText(greeting)
})

// Add elements to page
local container = createDiv({
  class: "p-4"
})

select("body").append(container.element)
container.element.appendChild(nameInput.element)
container.element.appendChild(greetBtn.element)
container.element.appendChild(output.element)
```

## Example: Counter with Multiple Buttons

Create `counter-demo.fxo`:

```fluxo
// Interactive counter
local count = 0

local display = createDiv({
  text: "Count: 0",
  class: "text-2xl font-bold mb-4"
})

local incrementBtn = createButton({
  text: "Increment (+1)",
  class: "px-4 py-2 bg-blue-500 text-white rounded mr-2"
})

local decrementBtn = createButton({
  text: "Decrement (-1)",
  class: "px-4 py-2 bg-red-500 text-white rounded mr-2"
})

local resetBtn = createButton({
  text: "Reset",
  class: "px-4 py-2 bg-gray-500 text-white rounded"
})

function updateDisplay() {
  local text = "Count: " + count
  display.setText(text)
}

incrementBtn.onClick(function() {
  count = count + 1
  updateDisplay()
})

decrementBtn.onClick(function() {
  count = count - 1
  updateDisplay()
})

resetBtn.onClick(function() {
  count = 0
  updateDisplay()
})

// Add to page
local container = createDiv({
  class: "p-8"
})

select("body").append(container.element)
container.element.appendChild(display.element)
container.element.appendChild(incrementBtn.element)
container.element.appendChild(decrementBtn.element)
container.element.appendChild(resetBtn.element)
```

## Available DOM Functions

### createButton(config)
```fluxo
local btn = createButton({
  text: "Click me",
  id: "my-button",
  class: "btn-primary",
  style: { color: "blue" }
})

btn.onClick(handler)
btn.setText(newText)
btn.setStyle({ color: "red" })
```

### createDiv(config)
```fluxo
local div = createDiv({
  text: "Content",
  id: "my-div",
  class: "container",
  style: { padding: "10px" }
})

div.onClick(handler)
div.onHover(handler)
div.setText(text)
div.setHTML(html)
div.setStyle(styles)
```

### createInput(config)
```fluxo
local input = createInput({
  type: "text",
  placeholder: "Enter text",
  value: "default",
  id: "my-input",
  class: "form-control"
})

input.onChange(handler)
input.onFocus(handler)
input.onBlur(handler)
input.setValue(value)
input.getValue()
```

### createText(text)
```fluxo
local paragraph = createText("This is a paragraph")
select("#container").append(paragraph.element)
```

### createHeading(text, level)
```fluxo
local h1 = createHeading("Main Title", 1)
local h2 = createHeading("Subtitle", 2)
```

### createParagraph(text)
```fluxo
local p = createParagraph("This is a paragraph of text.")
```

## String Concatenation Fix

The HTMLSupporter extension includes a fix for string concatenation with the `+` operator:

```fluxo
local name = "Taylor"
local age = 25

function say(n) {
  local text = "I'm " + name  // Now correctly outputs "I'm Taylor"
  console.log(text)
}

say(name)
```

**Before the fix**: Would output `0` (treating + as arithmetic)  
**After the fix**: Correctly outputs `I'm Taylor` (string concatenation)

## Console Output

Use `console.log()` to debug:

```fluxo
console.log("Button clicked!")
console.log("Count value: " + count)
```

Output appears in:
- Browser console (F12 → Console)
- IDE Output panel (when running code)

## Styling with Tailwind CSS

The preview environment includes Tailwind CSS classes:

```fluxo
createButton({
  text: "Styled Button",
  class: "px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
})
```

Common Tailwind classes:
- **Padding**: `p-4`, `px-6`, `py-3`
- **Colors**: `bg-blue-500`, `text-white`
- **Rounded**: `rounded`, `rounded-lg`
- **Shadow**: `shadow`, `shadow-lg`
- **Hover**: `hover:bg-blue-600`

## Modules with HTMLSupporter

You can create reusable UI modules:

**components/button.fxm**:
```fluxo
module UIComponents {
  export function createStyledButton(text, color) {
    local btnClass = "px-4 py-2 rounded text-white bg-" + color + "-500"
    return createButton({
      text: text,
      class: btnClass
    })
  }
}
```

**main.fxo**:
```fluxo
// Note: Module imports may not work yet in HTMLSupporter preview
// This will be supported in future updates
```

## Best Practices

1. **Initialize variables at the top**
   ```fluxo
   local count = 0
   local isActive = false
   ```

2. **Create elements before adding event handlers**
   ```fluxo
   local btn = createButton({...})
   btn.onClick(handler)
   select("body").append(btn.element)
   ```

3. **Use descriptive variable names**
   ```fluxo
   local submitButton = createButton({...})
   local userNameInput = createInput({...})
   ```

4. **Test in Preview tab**
   - Click the **Preview** tab after opening a Fluxo file
   - The preview auto-refreshes when you save changes

## Troubleshooting

### Preview tab is disabled
- ✓ Make sure HTMLSupporter extension is **enabled**
- ✓ Check you've opened a `.fxo` or `.fxm` file

### Button click doesn't work
- ✓ Verify you called `.onClick()` before appending to DOM
- ✓ Check browser console (F12) for errors

### String concatenation returns numbers
- ✓ This was fixed! Update your IDE to get the fix
- ✓ Use: `"text" + variable` format

### Styles not applying
- ✓ Check class names for typos
- ✓ Verify you're using valid Tailwind classes
- ✓ Use browser DevTools to inspect elements

## Next Steps

- Explore more DOM creation functions
- Build interactive forms and calculators
- Create custom UI components
- Experiment with event handling
- Try combining multiple interactive elements

Happy coding with Fluxo + HTMLSupporter! 🚀
