/**
 * Enhanced encryption utility for client-side end-to-end encryption with secure key storage
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
 * Generates a key derivation key from a password
 * @param {string} password - The user's password
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} - Key derivation key
 */
export async function deriveKeyFromPassword(
  password: string, 
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600000, // High iteration count for security
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

interface EncryptedPrivateKey {
  salt: string;
  iv: string;
  encryptedData: string;
}

/**
 * Encrypts and stores the private key using a password-derived key
 * @param {JsonWebKey} privateKey - The private key to store
 * @param {string} password - The password to derive the encryption key from
 */
export async function secureStorePrivateKey(
  privateKey: JsonWebKey, 
  password: string
): Promise<void> {
  try {
    // Generate a random salt for PBKDF2
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // Derive a key from the password
    const derivedKey = await deriveKeyFromPassword(password, salt);
    
    // Encrypt the private key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const privateKeyData = encoder.encode(JSON.stringify(privateKey));
    
    const encryptedPrivateKey = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      derivedKey,
      privateKeyData
    );
    
    // Store the encrypted key with metadata
    const encryptedKeyData: EncryptedPrivateKey = {
      salt: arrayBufferToBase64(salt),
      iv: arrayBufferToBase64(iv),
      encryptedData: arrayBufferToBase64(encryptedPrivateKey)
    };
    
    // Store in IndexedDB instead of localStorage
    await storeInIndexedDB("privateKeyData", encryptedKeyData);
  } catch (error) {
    console.error('Error securely storing private key:', error);
    throw new Error('Failed to securely store private key');
  }
}

/**
 * Retrieves and decrypts the private key using a password
 * @param {string} password - The password to derive the decryption key from
 * @returns {Promise<JsonWebKey | null>} - The decrypted private key or null if not found/incorrect password
 */
export async function secureGetPrivateKey(password: string): Promise<JsonWebKey | null> {
  try {
    // Retrieve the encrypted key data
    const encryptedKeyData = await getFromIndexedDB<EncryptedPrivateKey>("privateKeyData");
    if (!encryptedKeyData) return null;
    
    // Derive the key from the password and stored salt
    const salt = base64ToArrayBuffer(encryptedKeyData.salt);
    const derivedKey = await deriveKeyFromPassword(password, new Uint8Array(salt));
    
    // Decrypt the private key
    const iv = base64ToArrayBuffer(encryptedKeyData.iv);
    const encryptedData = base64ToArrayBuffer(encryptedKeyData.encryptedData);
    
    try {
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(iv)
        },
        derivedKey,
        encryptedData
      );
      
      // Convert the decrypted data to a JsonWebKey
      const decoder = new TextDecoder();
      const privateKeyString = decoder.decode(decryptedData);
      return JSON.parse(privateKeyString);
    } catch (decryptError) {
      // If decryption fails, it's likely due to an incorrect password
      console.error('Decryption failed, possibly incorrect password');
      return null;
    }
  } catch (error) {
    console.error('Error retrieving private key:', error);
    return null;
  }
}

/**
 * Checks if a private key exists in secure storage
 * @returns {Promise<boolean>} - True if a private key exists
 */
export async function hasSecurePrivateKey(): Promise<boolean> {
  const keyData = await getFromIndexedDB<EncryptedPrivateKey>("privateKeyData");
  return !!keyData;
}

/**
 * Removes the stored private key
 * @returns {Promise<void>}
 */
export async function removePrivateKey(): Promise<void> {
  await removeFromIndexedDB("privateKeyData");
}

/**
 * Helper function to store data in IndexedDB
 * @param {string} key - The key to store the data under
 * @param {T} data - The data to store
 * @returns {Promise<void>}
 */
async function storeInIndexedDB<T>(key: string, data: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CocoSecureStorage", 1);
    
    request.onupgradeneeded = function() {
      const db = request.result;
      if (!db.objectStoreNames.contains("keyStore")) {
        db.createObjectStore("keyStore");
      }
    };
    
    request.onsuccess = function() {
      const db = request.result;
      const transaction = db.transaction("keyStore", "readwrite");
      const store = transaction.objectStore("keyStore");
      
      store.put(data, key);
      
      transaction.oncomplete = function() {
        db.close();
        resolve();
      };
    };
    
    request.onerror = function() {
      reject(new Error("IndexedDB error: " + request.error));
    };
  });
}

/**
 * Helper function to retrieve data from IndexedDB
 * @param {string} key - The key to retrieve data for
 * @returns {Promise<T | null>} - The retrieved data or null if not found
 */
async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CocoSecureStorage", 1);
    
    request.onupgradeneeded = function() {
      const db = request.result;
      if (!db.objectStoreNames.contains("keyStore")) {
        db.createObjectStore("keyStore");
      }
    };
    
    request.onsuccess = function() {
      const db = request.result;
      const transaction = db.transaction("keyStore", "readonly");
      const store = transaction.objectStore("keyStore");
      const getRequest = store.get(key);
      
      getRequest.onsuccess = function() {
        db.close();
        resolve(getRequest.result || null);
      };
      
      getRequest.onerror = function() {
        db.close();
        reject(new Error("IndexedDB get error: " + getRequest.error));
      };
    };
    
    request.onerror = function() {
      reject(new Error("IndexedDB error: " + request.error));
    };
  });
}

/**
 * Helper function to remove data from IndexedDB
 * @param {string} key - The key to remove
 * @returns {Promise<void>}
 */
async function removeFromIndexedDB(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("CocoSecureStorage", 1);
    
    request.onsuccess = function() {
      const db = request.result;
      const transaction = db.transaction("keyStore", "readwrite");
      const store = transaction.objectStore("keyStore");
      
      const deleteRequest = store.delete(key);
      
      deleteRequest.onsuccess = function() {
        db.close();
        resolve();
      };
      
      deleteRequest.onerror = function() {
        db.close();
        reject(new Error("IndexedDB delete error: " + deleteRequest.error));
      };
    };
    
    request.onerror = function() {
      reject(new Error("IndexedDB error: " + request.error));
    };
  });
}

/**
 * Converts an ArrayBuffer to a base64 string
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert
 * @returns {string} - The base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
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

// Keep original encryption functions but update to use new secure key storage
export { encryptMessage, decryptMessage } from './encryption';