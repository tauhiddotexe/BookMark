# Lessons Learned

## CLI Arguments and Node.js `util.parseArgs`

### Problem
When writing Node.js subcommands (like `firebase mcp` inside `firebase-tools`) that use Node's native `util.parseArgs` to parse options, parent wrappers or IDE process managers (e.g. Cursor/Claude Desktop) might automatically inject global CLI options (like `--non-interactive`). If the subcommand doesn't expect these global options, `util.parseArgs` throws a fatal `ERR_PARSE_ARGS_UNKNOWN_OPTION` exception by default and terminates the process with code 1.

### Solution
Always configure `util.parseArgs` with `strict: false` in such scenarios:
```javascript
const { values } = parseArgs({
    options: { ... },
    allowPositionals: true,
    strict: false, // Prevents throwing errors for unexpected/global options
});
```
This ensures the command remains highly robust and compatible with various CLI shells, IDE environments, and automated process managers.
