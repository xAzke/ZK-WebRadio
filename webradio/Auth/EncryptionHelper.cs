using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Webradio.Auth;

public static class EncryptionHelper
{
    public static string Encrypt(string plainText, string key)
    {
        if (string.IsNullOrEmpty(plainText)) return string.Empty;
        if (string.IsNullOrEmpty(key)) throw new ArgumentException("Encryption key cannot be empty.");

        byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));
        byte[] iv = new byte[16];
        RandomNumberGenerator.Fill(iv);

        using var aes = Aes.Create();
        aes.Key = keyBytes;
        aes.IV = iv;

        using var memoryStream = new MemoryStream();
        memoryStream.Write(iv, 0, iv.Length);

        using (var cryptoStream = new CryptoStream(memoryStream, aes.CreateEncryptor(), CryptoStreamMode.Write))
        using (var writer = new StreamWriter(cryptoStream, Encoding.UTF8))
        {
            writer.Write(plainText);
        }

        return Convert.ToBase64String(memoryStream.ToArray());
    }

    public static string Decrypt(string cipherText, string key)
    {
        if (string.IsNullOrEmpty(cipherText)) return string.Empty;
        if (string.IsNullOrEmpty(key)) throw new ArgumentException("Encryption key cannot be empty.");

        try
        {
            byte[] cipherBytes = Convert.FromBase64String(cipherText);
            if (cipherBytes.Length < 16) return cipherText; // Fallback: Not encrypted (plain text)

            byte[] keyBytes = SHA256.HashData(Encoding.UTF8.GetBytes(key));
            byte[] iv = new byte[16];
            Array.Copy(cipherBytes, 0, iv, 0, 16);

            using var aes = Aes.Create();
            aes.Key = keyBytes;
            aes.IV = iv;

            using var memoryStream = new MemoryStream(cipherBytes, 16, cipherBytes.Length - 16);
            using var cryptoStream = new CryptoStream(memoryStream, aes.CreateDecryptor(), CryptoStreamMode.Read);
            using var reader = new StreamReader(cryptoStream, Encoding.UTF8);

            return reader.ReadToEnd();
        }
        catch
        {
            // Fallback: If decryption fails (e.g. old unencrypted tokens), return original text
            return cipherText;
        }
    }
}
