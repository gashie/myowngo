export class CodeRunner {
    constructor() {
        this._useLocal = null; // null = unknown, true/false = detected
    }

    async run(code) {
        // Try local Go compiler first if available
        if (this._useLocal === null) {
            try {
                const check = await fetch('/api/run-local', { method: 'HEAD' });
                this._useLocal = check.ok;
            } catch { this._useLocal = false; }
        }

        if (this._useLocal) {
            try {
                const result = await this._runLocal(code);
                if (result) return result;
            } catch (e) {
                console.warn('[CodeRunner] local run failed, falling through to playground:', e);
            }
        }

        return this._runPlayground(code);
    }

    async _runLocal(code) {
        const resp = await fetch('/api/run-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        });
        if (!resp.ok) return null;
        const result = await resp.json();

        if (result.error) {
            // Pass through any partial output even on error
            return { success: false, output: result.output || '', error: result.error };
        }

        // Check for empty output with non-empty stderr (possible silent failure)
        const output = result.output || '';
        const stderr = result.stderr || '';
        if (!output && stderr) {
            return { success: false, output: '', error: stderr };
        }

        return { success: true, output, error: stderr };
    }

    async _runPlayground(code) {
        try {
            const resp = await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            if (!resp.ok) {
                return { success: false, output: '', error: 'Server error: ' + resp.status };
            }

            const result = await resp.json();

            if (result.Errors) {
                return { success: false, output: '', error: result.Errors };
            }

            let stdout = '';
            let stderr = '';

            if (result.Events) {
                for (const event of result.Events) {
                    if (event.Kind === 'stdout') stdout += event.Message;
                    if (event.Kind === 'stderr') stderr += event.Message;
                }
            }

            return { success: true, output: stdout, error: stderr };
        } catch (err) {
            return { success: false, output: '', error: 'Network error: ' + err.message };
        }
    }
}
