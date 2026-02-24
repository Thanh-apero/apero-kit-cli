# Discord + OpenClaw Setup Guide

This directory contains configuration for running your AI agent on Discord via [OpenClaw](https://docs.openclaw.ai).

## Features

- **Auto Intent Detection** - No need to type `/plan` or `/brainstorm`, bot understands natural language
- **Skills System** - Commands converted to skills format for better context
- **Train Prompt** - Add new knowledge via URLs, files, or inline content
- **Progressive Disclosure** - Skills load on-demand to save tokens

## Quick Start

### 1. Install OpenClaw CLI

```bash
npm install -g openclaw
# or
npx openclaw
```

### 2. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name your bot
3. Go to "Bot" section and click "Add Bot"
4. Enable these Intents:
   - **Message Content Intent** (required)
   - **Server Members Intent** (recommended)
5. Click "Reset Token" to get your bot token

### 3. Configure Bot Token

**Option A: Environment Variable (Recommended)**
```bash
export DISCORD_BOT_TOKEN="your-bot-token-here"
```

**Option B: Direct Configuration**
```bash
openclaw config set channels.discord.token '"your-bot-token-here"' --json
```

### 4. Enable Discord Channel

```bash
openclaw config set channels.discord.enabled true --json
```

### 5. Start Gateway

```bash
openclaw gateway
```

### 6. Invite Bot to Server

1. Go to OAuth2 > URL Generator in Discord Developer Portal
2. Select scopes: `bot`, `applications.commands`
3. Select permissions:
   - View Channels
   - Send Messages
   - Read Message History
   - Embed Links
   - Attach Files
   - Add Reactions
4. Copy the generated URL and open it to invite the bot

### 7. Pairing (First-time Setup)

1. Send a DM to your bot in Discord
2. Bot responds with a pairing code
3. Approve the pairing:
   ```bash
   openclaw pairing approve discord <CODE>
   ```

## Using Commands

Your commands are available in two ways:

### As Slash Commands
Discord will automatically register your commands as slash commands.
Type `/` in Discord to see available commands.

Example:
- `/plan create a login feature`
- `/brainstorm how to optimize database queries`

### As Message Commands
Mention the bot with a command:
```
@YourBot /plan create a login feature
```

## Configuration

Edit `config.json5` to customize:

- **dmPolicy**: Control who can DM the bot
- **groupPolicy**: Control which servers can use the bot
- **guilds**: Configure per-server settings
- **streaming**: Enable live typing preview
- **bindings**: Route different users to different agents

## Commands Available

Your commands are defined in the `commands/` directory:

| Command | Description |
|---------|-------------|
| `/plan` | Create implementation plans |
| `/brainstorm` | Brainstorm solutions |
| `/fix` | Fix code issues |
| `/code` | Write code |
| `/review` | Review code changes |
| ... | See `commands/` for full list |

## Useful OpenClaw Commands

```bash
# Check status
openclaw channels status --probe

# View logs
openclaw logs --follow

# List pairings
openclaw pairing list discord

# Restart gateway
openclaw gateway restart

# Health check
openclaw doctor
```

## Skills System

Your commands are converted to **OpenClaw Skills** format for better AI understanding.

### Structure
```
.discord/
├── skills/
│   ├── auto-intent-router/    # Auto-detects user intent
│   │   └── SKILL.md
│   ├── train-prompt/          # Add new knowledge
│   │   └── SKILL.md
│   ├── planning/              # Converted from /plan
│   │   └── SKILL.md
│   ├── brainstorm/            # Converted from /brainstorm
│   │   └── SKILL.md
│   └── ...
├── commands/                  # Original commands (backup)
├── commands.json5             # Slash commands config
└── config.json5               # Main config
```

### How It Works

1. **Auto Intent Router** detects what user wants from natural language
2. **Appropriate skill** is activated automatically
3. User gets response without typing commands

Example:
```
User: "I need to add payment processing"
Bot: [Detects PLANNING intent, activates planning skill]
     "I'll help you plan the payment processing feature..."
```

## Training New Knowledge

Use the **train-prompt** skill to teach the bot new things:

### Train from URL
```
/train https://docs.stripe.com/api
```

### Train from File
```
/train:file ./docs/coding-standards.md
```

### Train Inline
```
/train:inline
Our deployment process:
1. Run tests
2. Build
3. Deploy staging
4. Deploy production
```

### List Trained Knowledge
```
/train:list
```

## Troubleshooting

**Bot not responding?**
- Check Message Content Intent is enabled
- Verify bot token is correct
- Run `openclaw doctor` for diagnostics

**Commands not showing?**
- Wait a few minutes for Discord to sync
- Check `commands.native` is set to `"auto"`

**Permission errors?**
- Verify bot has required permissions
- Check guild configuration in `config.json5`

**Skills not loading?**
- Check `skills/` directory exists
- Verify SKILL.md files have correct frontmatter
- Run `openclaw skills list` to see active skills

## Resources

- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Discord Channel Guide](https://docs.openclaw.ai/channels/discord)
- [Skills Guide](https://docs.openclaw.ai/tools/skills)
- [Slash Commands](https://docs.openclaw.ai/tools/slash-commands)
