from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64
import csv

def decrypt_whitelist(encrypted_whitelist, key):
    # Base64デコード
    encrypted_data = base64.b64decode(encrypted_whitelist)
    
    # IVを抽出
    iv = encrypted_data[:16]
    
    # 暗号文を抽出
    encrypted = encrypted_data[16:]
    
    # AES-CBCモードで復号
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = unpad(cipher.decrypt(encrypted), AES.block_size)
    
    return decrypted.decode('utf-8')

def read_encrypted_whitelist_from_csv(file_path):
    with open(file_path, mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        # 最初の行はヘッダーとしてスキップ
        next(reader)
        # 2行目もスキップ
        next(reader)
        # 3行目の暗号化データを読み込む
        encrypted_whitelist = next(reader)[0]
    return encrypted_whitelist

# 使用例
input_file_path = 'new_white.csv'  # 復号する暗号化ホワイトリストのCSVファイル
key = b"thisisaversecret"         # 16バイトのキーを使用

# CSVファイルから暗号化されたホワイトリストを読み込む
encrypted_whitelist = read_encrypted_whitelist_from_csv(input_file_path)
print(f"Encrypted Whitelist: {encrypted_whitelist}")

# 暗号化されたホワイトリストを復号
decrypted_whitelist = decrypt_whitelist(encrypted_whitelist, key)

print(f"Decrypted Whitelist: {decrypted_whitelist}")
