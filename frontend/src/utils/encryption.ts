/**
 * Encryption utility for client-side end-to-end encryption
 */

/**
 * Generates a new RSA key pair for the user
 * @returns {Promise<{publicKey: JsonWebKey, privateKey: JsonWebKey}>}
 */
export async function generateUserKeys(): Promise<{ publicKey: JsonWebKey, privateKey: JsonWebKey }> {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    // Export keys to JsonWebKey format
    const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    
    return { publicKey, privateKey };
  } catch (error) {
    console.error('Error generating keys:', error);
    throw new Error('Failed to generate encryption keys');
  }
}

/**
 * Stores the private key securely in localStorage
 * @param {JsonWebKey} privateKey - The private key to store
 */
export function storePrivateKey(privateKey: JsonWebKey): void {
  try {
    localStorage.setItem("privateKey", JSON.stringify(privateKey));
  } catch (error) {
    console.error('Error storing private key:', error);
    throw new Error('Failed to store private key');
  }
}

/**
 * Retrieves the private key from localStorage
 * @returns {JsonWebKey | null} - The retrieved private key or null if not found
 */
export function getPrivateKey(): JsonWebKey | null {
  try {
    const privateKeyString = localStorage.getItem("privateKey");
    if (!privateKeyString) return null;
    return JSON.parse(privateKeyString);
  } catch (error) {
    console.error('Error getting private key:', error);
    return null;
  }
}

/**
 * Encrypts a message using the recipient's public key
 * @param {string} message - The message to encrypt
 * @param {JsonWebKey} recipientPublicKey - The recipient's public key
 * @returns {Promise<{encryptedMessage: string, encryptedKey: string, iv: string}>}
 */
export async function encryptMessage(
  message: string, 
  recipientPublicKey: JsonWebKey
): Promise<{ encryptedMessage: string, encryptedKey: string, iv: string }> {
  try {
    // Generate random AES key for this message
    const messageKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    // Encrypt message with AES key
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedMessage = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      messageKey,
      encodedMessage
    );
    
    // Encrypt AES key with recipient's public key
    const importedPublicKey = await window.crypto.subtle.importKey(
      "jwk",
      recipientPublicKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );
    
    const exportedMessageKey = await window.crypto.subtle.exportKey("raw", messageKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      importedPublicKey,
      exportedMessageKey
    );
    
    // Convert ArrayBuffers to base64 strings for storage/transmission
    return {
      encryptedMessage: arrayBufferToBase64(encryptedMessage),
      encryptedKey: arrayBufferToBase64(encryptedKey),
      iv: arrayBufferToBase64(iv),
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypts a message using the user's private key
 * @param {string} encryptedMessage - The encrypted message as a base64 string
 * @param {string} encryptedKey - The encrypted AES key as a base64 string
 * @param {string} iv - The initialization vector as a base64 string
 * @param {JsonWebKey} privateKey - The user's private key
 * @returns {Promise<string>} - The decrypted message
 */
export async function decryptMessage(
  encryptedMessage: string,
  encryptedKey: string,
  iv: string,
  privateKey: JsonWebKey
): Promise<string> {
  try {
    // Import private key
    const importedPrivateKey = await window.crypto.subtle.importKey(
      "jwk",
      privateKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["decrypt"]
    );
    
    // Decrypt the AES key
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKey);
    const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      importedPrivateKey,
      encryptedKeyBuffer
    );
    
    // Import the decrypted AES key
    const importedAesKey = await window.crypto.subtle.importKey(
      "raw",
      decryptedKeyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["decrypt"]
    );
    
    // Decrypt the message
    const encryptedMessageBuffer = base64ToArrayBuffer(encryptedMessage);
    const ivBuffer = base64ToArrayBuffer(iv);
    const decryptedMessage = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer,
      },
      importedAesKey,
      encryptedMessageBuffer
    );
    
    // Convert decrypted ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedMessage);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Converts an ArrayBuffer to a base64 string
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert
 * @returns {string} - The base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts a base64 string to an ArrayBuffer
 * @param {string} base64 - The base64 string to convert
 * @returns {ArrayBuffer} - The ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}