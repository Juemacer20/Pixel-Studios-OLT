const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

function getKey() {
  const key = process.env.AES_KEY || 'pixel-studios-default-key-32chr!';
  return Buffer.from(key.padEnd(KEY_LENGTH).slice(0, KEY_LENGTH));
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: authTag.toString('hex'),
  });
}

function decrypt(ciphertext) {
  try {
    const { iv, data, tag } = JSON.parse(ciphertext);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (e) {
    return null;
  }
}

function encryptCredentials(credentials) {
  return encrypt(JSON.stringify(credentials));
}

function decryptCredentials(encrypted) {
  const json = decrypt(encrypted);
  return json ? JSON.parse(json) : null;
}

module.exports = { encrypt, decrypt, encryptCredentials, decryptCredentials };
