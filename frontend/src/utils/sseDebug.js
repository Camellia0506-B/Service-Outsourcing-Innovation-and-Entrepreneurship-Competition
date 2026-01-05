// src/utils/sseDebug.js

/**
 * Parse SSE (text/event-stream) from fetch streaming body.
 * - Split events by \n\n
 * - Support multi-line "data:" fields
 * - Support optional "event:" name
 * - Remove "data:" prefix before emitting
 * - Support JSON payload or plain text payload
 */
export async function debugStreamSSE({
    url,
    payload,
    signal,
    debug = false,
    onOpen,
    onToken,
    onDone,
    onError
}) {
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(payload),
            signal
        })

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        onOpen?.(resp)

        if (!resp.body)
            throw new Error('ReadableStream not supported in this environment')

        const reader = resp.body.getReader()
        const decoder = new TextDecoder('utf-8')

        let buf = '' // raw stream buffer
        let doneEmitted = false

        // helper: emit token safely
        const emitToken = t => {
            if (t == null) return
            const s = String(t)
            if (!s) return
            onToken?.(s)
        }

        // helper: handle one SSE event block (without trailing \n\n)
        const handleEventBlock = block => {
            // ignore comments/keep-alive
            // SSE comment line starts with ":"
            const trimmed = block.trim()
            if (!trimmed || trimmed.startsWith(':')) return

            let eventName = ''
            const dataLines = []

            const lines = block.split('\n')
            for (const line of lines) {
                if (line.startsWith('event:')) {
                    eventName = line.slice(6).trim()
                } else if (line.startsWith('data:')) {
                    // Keep exactly the part after "data:" (strip ONE leading space if present)
                    let v = line.slice(5)
                    if (v.startsWith(' ')) v = v.slice(1)
                    dataLines.push(v)
                } else {
                    // ignore id:, retry:, etc.
                }
            }

            if (!dataLines.length) return
            const dataStr = dataLines.join('\n')

            if (debug)
                console.log(
                    '[SSE] event=',
                    eventName || '(default)',
                    'data=',
                    dataStr
                )

            // done markers
            if (dataStr === '[DONE]' || eventName === 'done') {
                doneEmitted = true
                onDone?.({ reason: 'done' })
                return
            }

            // If data is JSON, try parse first
            let parsed = null
            try {
                parsed = JSON.parse(dataStr)
            } catch {}

            if (parsed) {
                // ✅ 这里按你后端协议适配（常见几种都兜底了）
                // 1) { type: "token", delta: "..." }
                if (parsed.type === 'token' && parsed.delta != null)
                    return emitToken(parsed.delta)

                // 2) { delta: "..." }
                if (parsed.delta != null) return emitToken(parsed.delta)

                // 3) { content: "..." }
                if (parsed.content != null) return emitToken(parsed.content)

                // 4) { type: "done" }
                if (parsed.type === 'done') {
                    doneEmitted = true
                    onDone?.(parsed)
                    return
                }

                // unknown json => stringify as fallback
                return emitToken(dataStr)
            }

            // plain text token
            emitToken(dataStr)
        }

        while (true) {
            const { value, done } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            if (debug) console.log('[SSE] chunk len=', chunk.length)
            buf += chunk

            // SSE event separator is blank line: \n\n
            // BUT: some servers may send \r\n\r\n; normalize first
            buf = buf.replace(/\r\n/g, '\n')

            let idx
            while ((idx = buf.indexOf('\n\n')) !== -1) {
                const eventBlock = buf.slice(0, idx)
                buf = buf.slice(idx + 2)
                handleEventBlock(eventBlock)
            }
        }

        // flush remaining partial event (rare)
        const tail = buf.replace(/\r\n/g, '\n').trim()
        if (tail) handleEventBlock(tail)

        if (!doneEmitted) onDone?.({ reason: 'eof' })
    } catch (e) {
        if (e?.name === 'AbortError') return
        onError?.(e)
    }
}
