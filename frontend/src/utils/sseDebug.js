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
                Accept: 'text/event-stream'
            },
            body: JSON.stringify(payload),
            signal
        })

        onOpen?.(resp)

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

        const reader = resp.body.getReader()
        const decoder = new TextDecoder('utf-8')

        let pending = ''
        let curEvent = 'message'
        let curDataLines = []

        const emitEvent = () => {
            // 允许空 data（用于换行）
            const data = curDataLines.join('\n')
            const evt = { event: curEvent || 'message', data }

            if (debug) console.log('[SSE] emit', evt)

            if (evt.event === 'token') onToken?.(evt)
            else if (evt.event === 'done' || evt.data === '[DONE]')
                onDone?.(evt)
            else if (evt.event === 'error')
                onError?.(new Error(evt.data || 'error'))
            // else 其他事件需要再处理
        }

        while (true) {
            const { value, done } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            pending += chunk.replace(/\r\n/g, '\n')

            let idx
            while ((idx = pending.indexOf('\n\n')) !== -1) {
                const block = pending.slice(0, idx)
                pending = pending.slice(idx + 2)

                const lines = block.split('\n')
                curEvent = 'message'
                curDataLines = []

                for (const line of lines) {
                    if (line.startsWith(':') || line === '') continue
                    if (line.startsWith('event:'))
                        curEvent = line.slice(6).trim()
                    else if (line.startsWith('data:'))
                        curDataLines.push(line.slice(5))
                }

                emitEvent()

                if (curEvent === 'done') {
                    try {
                        await reader.cancel()
                    } catch {}
                    return
                }
            }
        }

        onDone?.({ event: 'eof', data: '' })
    } catch (e) {
        if (e?.name === 'AbortError') return
        onError?.(e)
    }
}
