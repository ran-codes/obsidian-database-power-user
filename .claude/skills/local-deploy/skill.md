---
name: local-deploy
description: Build the plugin and deploy it to a local Obsidian vault for testing.
disable-model-invocation: true
allowed-tools: Bash(npm*), Bash(node*), Bash(npx*), Bash(mkdir*), Bash(cp*), Read, Glob
---

Deploy **bases-power-user** to the local Obsidian vault for testing. Do NOT build first — just copy the already-built files.

## Target

`D:/GitHub/work/.obsidian/plugins/bases-power-user/`

## Steps

1. **Create the plugin directory** if it doesn't exist.

2. **Copy these files** into the target directory:
   - `main.js`
   - `manifest.json`
   - `styles.css`

3. **Report success** and remind the user to reload Obsidian (Ctrl+R) or toggle the plugin off/on in Settings.
