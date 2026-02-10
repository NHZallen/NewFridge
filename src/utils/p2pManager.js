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
     * @param {Object} data - The data to send (Firebase config, etc.)
     * @returns {Promise<string>} - The 6-digit code to show on UI
     */
    initSender(data) {
        return new Promise((resolve, reject) => {
            const code = this.generateSyncCode()
            const peerId = `${APP_PREFIX}${code}`
            const peer = new Peer(peerId)
            let connection = null

            const timeoutId = setTimeout(() => {
                if (!connection) {
                    peer.destroy()
                    reject(new Error('配對逾時 (60秒)'))
                }
            }, 60000)

            let cancelFunc = () => {
                if (timeoutId) clearTimeout(timeoutId)
                if (connection) connection.close()
                peer.destroy()
            }

            peer.on('open', (id) => {
                console.log('Sender ID:', id)
                resolve({ code, cancel: cancelFunc })
            })

            peer.on('connection', (conn) => {
                if (timeoutId) clearTimeout(timeoutId)
                connection = conn

                conn.on('open', () => {
                    // Simple XOR masking for "encryption"
                    const jsonStr = JSON.stringify(data)
                    const key = code
                    let encrypted = ''
                    for (let i = 0; i < jsonStr.length; i++) {
                        encrypted += String.fromCharCode(jsonStr.charCodeAt(i) ^ key.charCodeAt(i % key.length))
                    }

                    conn.send({ data: encrypted, v: 1 }) // Versioned payload

                    // Wait a bit to ensure sent before closing usually, 
                    // but for simplicity we rely on peerjs buffering or close after short delay
                    setTimeout(() => {
                        conn.close()
                        peer.destroy()
                        // Sender logic usually done here
                    }, 1000)
                })
            })

            peer.on('error', (err) => {
                console.error('Sender Peer Error:', err)
                if (timeoutId) clearTimeout(timeoutId)
                reject(err)
            })
        })
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

                connection.on('data', (payload) => {
                    if (timeoutId) clearTimeout(timeoutId)

                    try {
                        let encrypted = payload.data
                        const key = code
                        let decrypted = ''
                        for (let i = 0; i < encrypted.length; i++) {
                            decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length))
                        }
                        const data = JSON.parse(decrypted)
                        resolve(data)
                    } catch (e) {
                        console.error("Decryption failed", e)
                        reject(new Error("資料解密失敗與驗證錯誤"))
                    }
                    connection.close() // Close connection
                    setTimeout(() => peer.destroy(), 500) // Destroy peer shortly after
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
