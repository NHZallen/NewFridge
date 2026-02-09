import { Peer } from 'peerjs'

// Prefix to make IDs unique on the public server
const APP_PREFIX = 'fridge-app-v1-sync-'

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
     * @param {string} code - The 6-digit code
     * @param {object} payload - The data to send
     * @param {function} onConnect - Callback when connection is established
     * @returns {Promise} - Resolves when sent, rejects on timeout/error
     */
    createSender(code, payload, onConnect) {
        let cancelFunc = null

        const promise = new Promise((resolve, reject) => {
            const peerId = `${APP_PREFIX}${code}`
            const peer = new Peer(peerId)
            let connection = null

            const timeoutId = setTimeout(() => {
                if (!connection) {
                    peer.destroy()
                    reject(new Error('配對逾時 (60秒)'))
                }
            }, 60000)

            cancelFunc = () => {
                if (timeoutId) clearTimeout(timeoutId)
                peer.destroy()
                reject(new Error('使用者已取消'))
            }

            peer.on('open', (id) => {
                console.log('Sender Peer ID:', id)
            })

            peer.on('connection', (conn) => {
                console.log('Receiver connected')
                connection = conn
                if (timeoutId) clearTimeout(timeoutId)

                if (onConnect) onConnect()

                conn.on('open', () => {
                    // Send payload
                    conn.send(payload)

                    // Wait a bit to ensure sent before closing usually, 
                    // but for simplicity we rely on peerjs buffering or close after short delay
                    setTimeout(() => {
                        conn.close()
                        peer.destroy()
                        resolve()
                    }, 1000)
                })
            })

            peer.on('error', (err) => {
                if (timeoutId) clearTimeout(timeoutId)
                peer.destroy()
                console.error('Peer error:', err)
                if (err.type === 'unavailable-id') {
                    reject(new Error('代碼產生衝突，請重試')) // Should be rare
                } else {
                    reject(err)
                }
            })
        })

        // Return object with both promise and cancel function
        // This allows callers to access cancel() even after awaiting
        return {
            promise,
            cancel: () => { if (cancelFunc) cancelFunc() }
        }
    },

    /**
     * Receiver (New Device)
     * @param {string} code - The 6-digit code entered by user
     * @returns {Promise} - Resolves with received data
     */
    createReceiver(code) {
        return new Promise((resolve, reject) => {
            const targetPeerId = `${APP_PREFIX}${code}`
            const peer = new Peer() // Auto-generate ID for receiver
            let connection = null
            let timeoutId = null

            // Timeout to avoid hanging forever
            timeoutId = setTimeout(() => {
                peer.destroy()
                reject(new Error('連線逾時，請確認代碼是否正確或已過期'))
            }, 10000) // 10s to find the peer is enough

            peer.on('open', (id) => {
                console.log('Receiver Peer ID:', id)
                connection = peer.connect(targetPeerId)

                connection.on('open', () => {
                    console.log('Connected to sender')
                    if (timeoutId) clearTimeout(timeoutId)
                })

                connection.on('data', (data) => {
                    console.log('Data received')
                    resolve(data)
                    connection.close() // Close connection
                    setTimeout(() => peer.destroy(), 500) // Destroy peer shortly after
                })

                connection.on('error', (err) => {
                    console.error('Connection error:', err)
                    reject(err)
                })
            })

            peer.on('error', (err) => {
                if (timeoutId) clearTimeout(timeoutId)
                peer.destroy()
                console.error('Peer error:', err)
                reject(new Error('無法連線到該裝置，請確認代碼是否正確'))
            })
        })
    }
}
