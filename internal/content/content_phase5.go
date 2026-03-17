package content

func init() {
	registerExplanations(map[string]string{
		"stdout": "## Standard Output\n\nJS: `process.stdout.write('hello')`\nGo: `fmt.Fprint(os.Stdout, \"hello\")`\n\n`os.Stdout` is the standard output file descriptor. You can write to it directly:\n```go\nos.Stdout.Write([]byte(\"hello\"))\n// or\nfmt.Fprint(os.Stdout, \"hello\")\n```\n\n`fmt.Println()` is just a convenient wrapper that writes to stdout with a newline.",

		"stderr": "## Standard Error\n\nJS: `process.stderr.write('error')`\nGo: `fmt.Fprint(os.Stderr, \"error\")`\n\nStderr is for error messages and diagnostics. Use it so that stdout can be piped cleanly:\n```go\nfmt.Fprint(os.Stderr, \"error occurred\")\n// or\nlog.Println(\"error\")  // log writes to stderr by default\n```",

		"stdin": "## Standard Input\n\nJS: `process.stdin` with event listeners\nGo: `bufio.NewReader(os.Stdin)`\n\n```go\nreader := bufio.NewReader(os.Stdin)\nfmt.Print(\"Enter name: \")\ntext, _ := reader.ReadString('\\n')\nname := strings.TrimSpace(text)\n```\n\nFor scanning structured input, use `fmt.Scan()`:\n```go\nvar name string\nfmt.Print(\"Name: \")\nfmt.Scan(&name)\n```",

		"files": "## File Operations\n\nJS: `fs.readFileSync()`, `fs.writeFileSync()`\nGo: `os.ReadFile()`, `os.WriteFile()` (Go 1.16+)\n\n```go\n// Read entire file\ndata, err := os.ReadFile(\"file.txt\")\n\n// Write entire file\nos.WriteFile(\"file.txt\", []byte(\"hello\"), 0644)\n\n// Low-level: open, read, write, close\nf, _ := os.OpenFile(\"file.txt\", os.O_RDWR, 0755)\ndefer f.Close()\nf.Write([]byte(\"hello\"))\n```\n\n**Always use `defer f.Close()`** to ensure files are closed!",

		"streams": "## Streams: io.Reader & io.Writer\n\nNode streams → Go's `io.Reader` and `io.Writer` interfaces:\n\n```go\n// io.Reader: anything you can read from\ntype Reader interface {\n    Read(p []byte) (n int, err error)\n}\n\n// io.Writer: anything you can write to\ntype Writer interface {\n    Write(p []byte) (n int, err error)\n}\n```\n\nPiping: `io.Copy(dst, src)` — like `src.pipe(dst)` in Node.\n\nFiles, network connections, HTTP bodies, buffers — they all implement these interfaces.",

		"cli_args": "## CLI Arguments\n\nJS: `process.argv.slice(2)`\nGo: `os.Args[1:]`\n\n```go\nargs := os.Args[1:]  // skip program name\nfmt.Println(args)\n```\n\n`os.Args[0]` is the program name (like `process.argv[0]` and `[1]` combined).",

		"cli_flags": "## CLI Flags\n\nJS: use `yargs` or `commander` packages\nGo: built-in `flag` package!\n\n```go\nvar name string\nflag.StringVar(&name, \"name\", \"default\", \"description\")\nflag.Parse()\nfmt.Println(name)\n```\n\nUsage: `./program --name=alice`\n\nNo third-party package needed — `flag` is in the standard library.",

		"env_vars": "## Environment Variables\n\nJS: `process.env.API_KEY`\nGo: `os.Getenv(\"API_KEY\")`\n\n```go\nkey := os.Getenv(\"API_KEY\")\nif key == \"\" {\n    log.Fatal(\"API_KEY not set\")\n}\n```\n\nSet: `os.Setenv(\"KEY\", \"value\")`\nCheck existence: use `os.LookupEnv()` which returns (value, bool).",

		"exec": "## Executing Commands\n\nJS: `child_process.exec(cmd, callback)`\nGo: `exec.Command(name, args...)`\n\n```go\ncmd := exec.Command(\"echo\", \"hello world\")\ncmd.Stdout = os.Stdout\ncmd.Stderr = os.Stderr\ncmd.Run()\n```\n\nThe command and arguments are passed separately (no shell injection risk!).",

		"exec_sync": "## Synchronous Exec\n\nJS: `execSync('echo hello')`\nGo: `exec.Command(...).Output()`\n\n```go\noutput, err := exec.Command(\"echo\", \"hello\").Output()\nif err != nil {\n    log.Fatal(err)\n}\nfmt.Println(string(output))\n```\n\nAll Go code runs synchronously by default (unlike Node's async nature). `Output()` runs the command and captures stdout.",
	})

	registerTips(map[string][]TeacherTip{
		"stdout": {
			{Type: "protip", Title: "fmt.Println vs os.Stdout.Write",
				Content: "fmt.Println() adds formatting + newline.\nos.Stdout.Write() writes raw bytes.\n\nFor performance-critical output, os.Stdout.Write is faster."},
		},
		"stdin": {
			{Type: "gotcha", Title: "ReadString includes the delimiter!",
				Content: "reader.ReadString('\\n') includes the \\n!\nAlways use strings.TrimSpace() to clean it up."},
		},
		"files": {
			{Type: "remember", Title: "Always defer f.Close()!",
				Content: "Open a file? Immediately defer its close:\n\nf, err := os.Open(\"file.txt\")\nif err != nil { return err }\ndefer f.Close()  // runs when function returns"},
			{Type: "gotcha", Title: "os.ReadFile reads entire file to memory",
				Content: "For small files: os.ReadFile() is fine.\nFor large files: use bufio.Scanner line-by-line."},
		},
		"streams": {
			{Type: "remember", Title: "io.Reader/Writer are everywhere",
				Content: "These two interfaces power all of Go I/O:\n\nos.File, http.Response.Body, bytes.Buffer,\nnet.Conn, gzip.Writer — all implement them.\n\nio.Copy(dst, src) connects any reader to any writer."},
		},
		"cli_args": {
			{Type: "protip", Title: "os.Args[0] is the program name",
				Content: "os.Args[0] = program path\nos.Args[1:] = actual arguments\n\nLike process.argv but indexed differently."},
		},
		"cli_flags": {
			{Type: "protip", Title: "No third-party package needed!",
				Content: "Go's stdlib flag package handles:\n- String, Bool, Int, Float flags\n- Default values\n- Help text (--help auto-generated)\n\nFor complex CLIs, check out cobra or urfave/cli."},
		},
		"env_vars": {
			{Type: "gotcha", Title: "Getenv returns empty string for missing keys",
				Content: "os.Getenv(\"MISSING\") returns \"\" (not undefined).\n\nTo check if a variable EXISTS vs is empty:\nval, exists := os.LookupEnv(\"KEY\")"},
		},
		"exec": {
			{Type: "remember", Title: "Command and args are separate!",
				Content: "JS: exec('echo hello world')  // shell interprets\nGo: exec.Command(\"echo\", \"hello world\") // no shell\n\nThis prevents shell injection attacks!"},
		},
	})

	// Phase 5 lessons are mostly View Only (not Playable), so challenges are quiz-style
	registerChallenges(map[string]Challenge{
		"stdout": {
			Type:        "rewrite",
			Prompt:      "Convert JS stdout write to Go.\n\nJavaScript: `process.stdout.write('hello world\\n')`\nGo: `fmt.Fprint(os.Stdout, \"hello world\\n\")`\n\nRequirements:\n- Use `fmt.Fprint(os.Stdout, ...)` to write directly to stdout\n- Output: `hello world`",
			StarterCode: "package main\n\nimport (\n\t\"fmt\"\n\t\"os\"\n)\n\n// Write directly to stdout using fmt.Fprint and os.Stdout.\n//\n// Expected output: hello world\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport (\n\t\"fmt\"\n\t\"os\"\n)\n\nfunc main() {\n\tfmt.Fprint(os.Stdout, \"hello world\\n\")\n}",
			ExpectedOut: "hello world\n",
			Hints:       []string{"Use fmt.Fprint(os.Stdout, ...)", "os.Stdout is the standard output"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"cli_args": {
			Type:        "rewrite",
			Prompt:      "Rewrite in Go:\nconst args = process.argv.slice(2)\nconsole.log(args)",
			StarterCode: "package main\n\nimport (\n\t\"fmt\"\n\t\"os\"\n)\n\nfunc main() {\n\t// Get CLI arguments (skip program name)\n}",
			Solution:    "package main\n\nimport (\n\t\"fmt\"\n\t\"os\"\n)\n\nfunc main() {\n\targs := os.Args[1:]\n\tfmt.Println(args)\n}",
			ExpectedOut: "[]\n",
			Hints:       []string{"os.Args[0] is the program name", "os.Args[1:] gives you the arguments"},
			BonusXP:     5,
			BonusCoins:  3,
		},
	})

	registerTests(map[string][]TestCase{
		"stdout": {
			{Name: "Writes to stdout", ExpectedOut: "hello world\n"},
		},
	})
}
