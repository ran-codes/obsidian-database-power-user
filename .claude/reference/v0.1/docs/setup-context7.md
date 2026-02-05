# Setting Up Context7 MCP for Claude Code

Context7 fetches up-to-date documentation for libraries and injects it into Claude's context. Useful for Obsidian API docs that aren't in Claude's training data.

## Prerequisites

- Node.js 18+
- Claude Code CLI installed

## Quick Setup (One Command)

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

Done. Restart Claude Code.

## Manual Setup

If the quick command doesn't work, edit your MCP config file directly.

**Location**: `~/.claude/settings.json` (or check `claude mcp list` for the config path)

Add to the `mcpServers` section:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

Restart Claude Code.

## Verify It's Working

```bash
claude mcp list
```

Should show `context7` in the list.

## Usage

Add "use context7" to any prompt where you want live docs:

```
use context7 to look up Obsidian Bases Plugin API getViewOptions
```

Or specify a library ID directly if you know it:

```
use context7 with obsidian to check BasesView options types
```

## Sources

- [Context7 GitHub](https://github.com/upstash/context7)
- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp)
- [Context7 + Claude Code Setup Guide](https://shinzo.ai/blog/how-to-set-up-context7-with-claude-code)
