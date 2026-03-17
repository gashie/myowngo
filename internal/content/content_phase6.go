package content

func init() {
	registerExplanations(map[string]string{
		"promises": "## Promises → Channels\n\nJS Promises represent a future value. Go uses **channels**:\n\n```go\n// JS Promise\nconst result = await asyncMethod('foo');\n\n// Go Channel\nch := make(chan string)\ngo func() {\n    ch <- \"result\"  // send\n}()\nresult := <-ch      // receive (blocks until ready)\n```\n\n**Promise.all** → `sync.WaitGroup`:\n```go\nvar wg sync.WaitGroup\nwg.Add(3)\nfor i := 0; i < 3; i++ {\n    go func() {\n        defer wg.Done()\n        // do work\n    }()\n}\nwg.Wait()  // blocks until all done\n```",

		"async_await": "## Async/Await → Goroutines + Channels\n\nJS: `async function` + `await`\nGo: `go func()` + `<-channel`\n\n```go\nfunc hello(name string) chan string {\n    ch := make(chan string, 1)\n    go func() {\n        time.Sleep(1 * time.Second)\n        ch <- \"hello \" + name\n    }()\n    return ch\n}\n\nresult := <-hello(\"bob\")  // like await\n```\n\n**Key insight:** Go doesn't need async/await because goroutines are lightweight threads. Every goroutine runs concurrently without special syntax.",

		"generators": "## Generators → Channels\n\nJS generators yield values lazily. Go channels do the same:\n\n```go\nfunc generator() chan string {\n    ch := make(chan string)\n    go func() {\n        ch <- \"hello\"\n        ch <- \"world\"\n        close(ch)  // signal no more values\n    }()\n    return ch\n}\n\nfor value := range generator() {\n    fmt.Println(value)\n}\n```\n\n`close(ch)` signals that no more values will be sent. `range` over a channel reads until it's closed.",

		"event_emitter": "## Event Emitter → Channels + Select\n\nJS EventEmitter:\n```js\nemitter.on('event', handler);\nemitter.emit('event', data);\n```\n\nGo uses channels as event buses:\n```go\nevents := make(map[string]chan string)\nevents[\"my-event\"] = make(chan string)\n\n// Listener\ngo func() {\n    for {\n        select {\n        case msg := <-events[\"my-event\"]:\n            fmt.Println(msg)\n        }\n    }\n}()\n\n// Emit\nevents[\"my-event\"] <- \"hello\"\n```\n\n`select` multiplexes multiple channels — like listening to multiple events at once.",

		"timeout": "## setTimeout → time.AfterFunc\n\nJS: `setTimeout(callback, 1000)`\nGo: `time.AfterFunc(time.Second, callback)`\n\n```go\ntime.AfterFunc(1*time.Second, func() {\n    fmt.Println(\"called after 1 second\")\n})\n```\n\nOr use `time.After()` with channels:\n```go\n<-time.After(1 * time.Second)  // blocks for 1 second\nfmt.Println(\"done waiting\")\n```",

		"interval": "## setInterval → time.NewTicker\n\nJS: `setInterval(callback, 1000)`\nGo: `time.NewTicker(time.Second)`\n\n```go\nticker := time.NewTicker(1 * time.Second)\nfor range ticker.C {\n    fmt.Println(\"tick\")\n}\nticker.Stop()  // like clearInterval\n```\n\n`ticker.C` is a channel that receives a value on each tick. `ticker.Stop()` stops it (like `clearInterval`).",
	})

	registerTips(map[string][]TeacherTip{
		"promises": {
			{Type: "gotcha", Title: "Goroutines are NOT promises",
				Content: "A goroutine doesn't return a value. Use channels:\n\nch := make(chan string)\ngo func() { ch <- \"result\" }()\nresult := <-ch"},
			{Type: "remember", Title: "Buffered vs unbuffered channels",
				Content: "ch := make(chan int)    // unbuffered — blocks until both sides ready\nch := make(chan int, 5) // buffered — holds 5 values without blocking\n\nUnbuffered = synchronization point\nBuffered = async queue"},
		},
		"async_await": {
			{Type: "remember", Title: "Mental model for async",
				Content: "async function  -> go func() { ... }()\nawait result   -> result := <-channel\nPromise.all    -> sync.WaitGroup"},
			{Type: "gotcha", Title: "Goroutines are incredibly cheap!",
				Content: "A goroutine uses ~2KB of stack (vs ~1MB for OS threads).\nYou can run millions of goroutines. Don't be afraid to use them."},
		},
		"generators": {
			{Type: "protip", Title: "Close channels when done",
				Content: "Always close(ch) when you're done sending.\nReceivers use 'for v := range ch' to read until closed.\n\nForgetting to close = receiver blocks forever (goroutine leak)!"},
		},
		"event_emitter": {
			{Type: "remember", Title: "select is like switch for channels",
				Content: "select {\ncase msg := <-ch1:\n    // received from ch1\ncase msg := <-ch2:\n    // received from ch2\ncase <-time.After(5 * time.Second):\n    // timeout\n}\n\nselect blocks until one case is ready."},
		},
		"timeout": {
			{Type: "protip", Title: "time.After returns a channel",
				Content: "select {\ncase result := <-workCh:\n    fmt.Println(result)\ncase <-time.After(5 * time.Second):\n    fmt.Println(\"timeout!\")\n}\n\nPerfect for implementing timeouts."},
		},
		"interval": {
			{Type: "gotcha", Title: "Always call ticker.Stop()!",
				Content: "Unlike JS setInterval, Go tickers keep running even if you stop reading.\n\nAlways call ticker.Stop() to release resources.\nUse defer ticker.Stop() right after creating it."},
		},
	})

	registerChallenges(map[string]Challenge{
		"generators": {
			Type:        "build",
			Prompt:      "Write a channel-based generator for numbers 1-5.\n\nRequirements:\n- `numbers()` returns `chan int`\n- Inside, create channel, start goroutine that sends 1-5, then `close(ch)`\n- `main` already uses `for n := range numbers()` to print\n- Output: `1`, `2`, `3`, `4`, `5` (5 lines)",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Build a channel-based generator that yields numbers 1 through 5.\n// Send values in a goroutine and close the channel when done.\n//\n// Expected output:\n//   1\n//   2\n//   3\n//   4\n//   5\n\nfunc numbers() chan int {\n\t// Your code here\n}\n\nfunc main() {\n\tfor n := range numbers() {\n\t\tfmt.Println(n)\n\t}\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc numbers() chan int {\n\tch := make(chan int)\n\tgo func() {\n\t\tfor i := 1; i <= 5; i++ {\n\t\t\tch <- i\n\t\t}\n\t\tclose(ch)\n\t}()\n\treturn ch\n}\n\nfunc main() {\n\tfor n := range numbers() {\n\t\tfmt.Println(n)\n\t}\n}",
			ExpectedOut: "1\n2\n3\n4\n5\n",
			Hints:       []string{"Send values in a goroutine: go func() { ch <- value }()", "close(ch) signals no more values"},
			BonusXP:     15,
			BonusCoins:  8,
		},
	})

	registerTests(map[string][]TestCase{
		"generators": {
			{Name: "Generates 1-5", ExpectedOut: "1\n2\n3\n4\n5\n"},
		},
	})
}
