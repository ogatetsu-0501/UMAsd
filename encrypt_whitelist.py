from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
from Crypto.Random import get_random_bytes
import base64
import csv

def encrypt_whitelist(whitelist, key):
    # 16バイトのランダムなIVを生成
    iv = get_random_bytes(16)
    
    # AES-CBCモードで暗号化
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(whitelist.encode(), AES.block_size))
    
    # IVと暗号文を結合し、Base64エンコード
    encrypted_data = base64.b64encode(iv + encrypted).decode()
    
    return encrypted_data

def read_whitelist_from_csv(file_path):
    with open(file_path, mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        # ホワイトリストのメールアドレスをカンマ区切りで結合
        whitelist = ','.join(row[0] for row in reader)
    return whitelist

def write_encrypted_whitelist_to_csv(encrypted_whitelist, output_file_path):
    with open(output_file_path, mode='w', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['encrypted_whitelist'])
        writer.writerow([encrypted_whitelist])

# 使用例
csv_file_path = 'white.csv'        # 入力となるホワイトリストのCSVファイル
output_file_path = 'new_white.csv' # 出力する暗号化ホワイトリストのCSVファイル
key = b"thisisaversecret"         # 16バイトのキーを使用

# CSVファイルからホワイトリストを読み込む
whitelist = read_whitelist_from_csv(csv_file_path)
print(f"Original Whitelist: {whitelist}")

# ホワイトリストを暗号化
encrypted_whitelist = encrypt_whitelist(whitelist, key)

# 暗号化されたホワイトリストを新しいCSVファイルに保存
write_encrypted_whitelist_to_csv(encrypted_whitelist, output_file_path)

print(f"Encrypted Whitelist saved to {output_file_path}")
