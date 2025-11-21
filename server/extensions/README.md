# Fluxo IDE Extensions

## How to Add a New Extension

Extensions are now file-based! To add a new extension, simply create a JSON file in the `server/extensions/` directory.

### Extension JSON Structure

Create a file named `{extension-id}.json` with the following structure:

```json
{
  "id": "my-extension",
  "name": "My Extension Name",
  "version": "1.0.0",
  "description": "What your extension does",
  "author": "Your Name",
  "category": "language",
  "enabled": true,
  "isInstalled": true,
  "isCustom": false,
  "trending": false,
  "downloads": 0,
  "rating": 5.0,
  "packages": [
    {
      "name": "Package Name",
      "description": "What this package provides",
      "required": true
    }
  ]
}
```

### Field Descriptions

- **id**: Unique identifier for the extension (kebab-case)
- **name**: Display name shown in the UI
- **version**: Semantic version (e.g., "1.0.0")
- **description**: What the extension does
- **author**: Who created it
- **category**: One of: "theme", "language", "utility", "formatter", "linter"
- **enabled**: Whether it's enabled by default (true/false)
- **isInstalled**: Should always be true for file-based extensions
- **isCustom**: Set to false for official extensions, true for custom ones
- **trending**: Show in trending section (optional)
- **downloads**: Display download count (optional)
- **rating**: Star rating out of 5 (optional)
- **packages**: Array of package dependencies (optional)

### Example: HTML Supporter Extension

See `html-supporter.json` for a complete example.

### Steps to Add Your Extension

1. Create a new JSON file: `server/extensions/my-extension.json`
2. Fill in the required fields
3. Restart the application
4. Your extension will appear in the Extensions page automatically!

### Enabling/Disabling Extensions

Users can toggle extensions on/off from the Extensions page. The toggle state is saved back to the JSON file.

### No Upload/Download Needed!

Since extensions are file-based, there's no need for download or install functionality. Just add the JSON file and restart!
