from Crypto.Cipher import AES
import base64
import hashlib


class AESUtil:
    def __init__(self, skey):
        self.BLOCK_SIZE = 16  # Bytes
        self.key = hashlib.md5(skey.encode('utf8')).hexdigest()[8:-8]

    def pad(self, s): return s + (self.BLOCK_SIZE - len(s) % self.BLOCK_SIZE) * \
        chr(self.BLOCK_SIZE - len(s) % self.BLOCK_SIZE)

    def unpad(self, s): return s[:-ord(s[len(s) - 1:])]

    def aesEncrypt(self, data):
        '''
        AES的ECB模式加密方法
        :param key: 密钥
        :param data:被加密字符串（明文）
        :return:密文
        '''
        key = self.key.encode('utf8')
        # 字符串补位
        data = base64.b64encode(data.encode('utf8')).decode()
        data = self.pad(data)
        cipher = AES.new(key, AES.MODE_ECB)
        # 加密后得到的是bytes类型的数据，使用Base64进行编码,返回byte字符串
        result = cipher.encrypt(data.encode())
        encodestrs = base64.b64encode(result)
        enctext = encodestrs.decode('utf8')
        # print(enctext)
        return enctext

    def aesDecrypt(self, data):
        '''
        :param key: 密钥
        :param data: 加密后的数据（密文）
        :return:明文
        '''
        key = self.key.encode('utf8')
        data = base64.b64decode(data)
        cipher = AES.new(key, AES.MODE_ECB)
        # 去补位
        text_decrypted = self.unpad(cipher.decrypt(data))
        text_decrypted = base64.b64decode(text_decrypted).decode('utf8')
        # print(text_decrypted)
        return text_decrypted


if __name__ == '__main__':
    key = 'ab'
    data = 'aaaaaaaaaaaaaaaa'
    AES_C = AESUtil(key)
    ecdata = AES_C.aesEncrypt(data)
    decdata = AES_C.aesDecrypt(ecdata)
    print(ecdata, '\n', decdata)
