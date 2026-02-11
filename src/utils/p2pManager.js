import { Peer } from 'peerjs'

// Prefix to make IDs unique on the public server
const APP_PREFIX = 'fridge-app-v1-sync-'

// --- AES-GCM Encryption Helpers ---

async function deriveKey(code) {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(code))
    return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptData(data, code) {
    const key = await deriveKey(code)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(ciphertext)),
        v: 2
    }
}

async function decryptData(payload, code) {
    const key = await deriveKey(code)
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
        key,
        new Uint8Array(payload.data)
    )
    return JSON.parse(new TextDecoder().decode(decrypted))
}

// --- P2P Manager ---

export const p2pManager = {
    // Generate a random 6-character alphanumeric code
    generateSyncCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed easily confused chars (I, 1, O, 0)
        let result = ''
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    },

    /**
     * Sender (Old Device)
     * @param {string} code - 6-char sync code (from generateSyncCode)
     * @param {Object} data - The data to send (Firebase config, etc.)
     * @param {Function} onConnected - Callback when receiver connects
     * @returns {{ cancel: Function, promise: Promise<void> }}
     */
    createSender(code, data, onConnected) {
        const peerId = `${APP_PREFIX}${code}`
        const peer = new Peer(peerId)
        let connection = null
        let timeoutId = null
        let rejectPromise = null

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId)
            if (connection) connection.close()
            peer.destroy()
        }

        const promise = new Promise((resolve, reject) => {
            rejectPromise = reject

            // 60 秒 timeout — 避免 caller 忘記 cancel 造成資源殘留
            timeoutId = setTimeout(() => {
                if (!connection) {
                    cleanup()
                    reject(new Error('配對逾時 (60秒)'))
                }
            }, 60000)

            peer.on('open', () => {
                // Peer ready, waiting for receiver...
            })

            peer.on('connection', (conn) => {
                if (timeoutId) clearTimeout(timeoutId)
                connection = conn

                conn.on('open', async () => {
                    if (onConnected) onConnected()
                    try {
                        const encrypted = await encryptData(data, code)
                        conn.send(encrypted)
                    } catch (e) {
                        console.error('Encryption failed:', e)
                        conn.send({ error: '加密失敗' })
                    }

                    setTimeout(() => {
                        conn.close()
                        peer.destroy()
                        resolve()
                    }, 1000)
                })
            })

            peer.on('error', (err) => {
                console.error('Sender Peer Error:', err)
                cleanup()
                reject(err)
            })
        })

        const cancel = () => {
            cleanup()
            if (rejectPromise) rejectPromise(new Error('cancelled'))
        }

        return { cancel, promise }
    },

    /**
     * Receiver (New Device)
     * @param {string} code - The 6-digit code entered by user
     * @returns {Promise<Object>} - The received data
     */
    connectToSender(code) {
        return new Promise((resolve, reject) => {
            const targetPeerId = `${APP_PREFIX}${code}`
            const peer = new Peer() // Auto ID
            let connection = null
            let timeoutId = null

            // Timeout to avoid hanging forever
            timeoutId = setTimeout(() => {
                if (connection) connection.close()
                peer.destroy()
                reject(new Error('連線逾時，請確認代碼是否正確或已過期'))
            }, 10000) // 10s to find the peer is enough

            peer.on('open', (id) => {

                connection = peer.connect(targetPeerId)

                connection.on('open', () => {
                    // Connected! Waiting for data.
                })

                connection.on('data', async (payload) => {
                    if (timeoutId) clearTimeout(timeoutId)

                    try {
                        if (payload.error) {
                            throw new Error(payload.error)
                        }
                        const data = await decryptData(payload, code)
                        resolve(data)
                    } catch (e) {
                        console.error('Decryption failed', e)
                        reject(new Error('資料解密失敗與驗證錯誤'))
                    }
                    connection.close()
                    setTimeout(() => peer.destroy(), 500)
                })

                connection.on('error', (err) => {
                    if (timeoutId) clearTimeout(timeoutId)
                    // Common error: peer-unavailable
                    if (err.type === 'peer-unavailable') {
                        reject(new Error('找不到來源裝置，請確認代碼是否正確'))
                    } else {
                        reject(err)
                    }
                })
            })

            peer.on('error', (err) => {
                // Receiver init error
                if (timeoutId) clearTimeout(timeoutId)
                reject(err)
            })
        })
    }
}
