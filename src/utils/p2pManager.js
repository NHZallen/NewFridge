import { Peer } from 'peerjs'

// Prefix to make IDs unique on the public server
const APP_PREFIX = 'fridge-app-v1-sync-'

// Sync code validity duration (10 minutes)
const CODE_EXPIRY_MS = 10 * 60 * 1000

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

// --- Challenge-Response Helpers ---

async function computeChallenge(code, nonce) {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(code),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(nonce))
    return Array.from(new Uint8Array(sig))
}

function arrayEqual(a, b) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

// --- P2P Manager ---

export const p2pManager = {
    // Generate a random 8-character alphanumeric code
    generateSyncCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed easily confused chars (I, 1, O, 0)
        let result = ''
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    },

    /**
     * Sender (Old Device)
     * @param {string} code - 8-char sync code (from generateSyncCode)
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
        const createdAt = Date.now()

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
                // Check code expiry
                if (Date.now() - createdAt > CODE_EXPIRY_MS) {
                    conn.close()
                    cleanup()
                    reject(new Error('同步碼已過期，請重新產生'))
                    return
                }

                if (timeoutId) clearTimeout(timeoutId)
                connection = conn

                conn.on('open', async () => {
                    if (onConnected) onConnected()

                    try {
                        // === Challenge-Response Authentication ===
                        const nonce = crypto.randomUUID()
                        const expectedResponse = await computeChallenge(code, nonce)

                        // Send challenge
                        conn.send({ type: 'challenge', nonce })

                        // Wait for response
                        const response = await new Promise((res, rej) => {
                            const authTimeout = setTimeout(() => rej(new Error('驗證逾時')), 5000)
                            conn.on('data', (msg) => {
                                clearTimeout(authTimeout)
                                res(msg)
                            })
                        })

                        if (response.type !== 'challenge-response' || !arrayEqual(response.hmac, expectedResponse)) {
                            conn.send({ type: 'auth-failed' })
                            throw new Error('驗證失敗：對方未通過身份認證')
                        }

                        // Auth passed — send encrypted data
                        const encrypted = await encryptData(data, code)
                        conn.send({ type: 'data', payload: encrypted })
                    } catch (e) {
                        console.error('Sender auth/encryption failed:', e)
                        conn.send({ type: 'error', message: e.message || '驗證或加密失敗' })
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
     * @param {string} code - The 8-digit code entered by user
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
            }, 10000)

            peer.on('open', () => {
                connection = peer.connect(targetPeerId)

                connection.on('open', () => {
                    // Connected! Waiting for challenge...
                })

                connection.on('data', async (msg) => {
                    try {
                        if (msg.type === 'challenge') {
                            // Respond to challenge
                            const hmac = await computeChallenge(code, msg.nonce)
                            connection.send({ type: 'challenge-response', hmac })
                        } else if (msg.type === 'data') {
                            // Received encrypted data
                            if (timeoutId) clearTimeout(timeoutId)
                            const data = await decryptData(msg.payload, code)
                            resolve(data)
                            connection.close()
                            setTimeout(() => peer.destroy(), 500)
                        } else if (msg.type === 'auth-failed') {
                            if (timeoutId) clearTimeout(timeoutId)
                            reject(new Error('身份驗證失敗，請確認代碼是否正確'))
                            connection.close()
                            peer.destroy()
                        } else if (msg.type === 'error') {
                            if (timeoutId) clearTimeout(timeoutId)
                            reject(new Error(msg.message || '傳輸錯誤'))
                            connection.close()
                            peer.destroy()
                        }
                    } catch (e) {
                        if (timeoutId) clearTimeout(timeoutId)
                        console.error('Receiver processing failed', e)
                        reject(new Error('資料解密失敗或驗證錯誤'))
                        connection.close()
                        peer.destroy()
                    }
                })

                connection.on('error', (err) => {
                    if (timeoutId) clearTimeout(timeoutId)
                    if (err.type === 'peer-unavailable') {
                        reject(new Error('找不到來源裝置，請確認代碼是否正確'))
                    } else {
                        reject(err)
                    }
                })
            })

            peer.on('error', (err) => {
                if (timeoutId) clearTimeout(timeoutId)
                reject(err)
            })
        })
    }
}

