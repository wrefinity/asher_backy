from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import hashlib


def hash_data_sha256(data):
    """Hash using sha 256"""
    digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
    digest.update(data.encode())
    return digest.finalize().hex()


def hash_data_md5(data):
    """hashing using md5"""
    hasher = hashlib.md5(data.encode())
    return hasher.hexdigest()


if __name__ == "__main__":

    password = "MySecurePassword123!"
    common_password = "password123"

    # use sha 256
    sha256_hash = hash_data_sha256(password)
    print(f"\n Original Password (SHA 256): {password}")
    print(f"\n Hash - (SHA 256): {sha256_hash}")
    # use md5
    md5_hash = hash_data_md5(common_password)
    print(f"\n Common Password (MD5): {common_password}")
    print(f"\n Hash - (MD5): {md5_hash}")

    # stolen_hash = 72909f2571253457a412030d97274070 - password123
    stolen_hash_md5 = "482c811da5d5b4bc6d497ffa98491e38"
    dictionary_password = [
        "123456",
        "admin",
        "password",
        "pass123",
        "123",
        "password123",
        "qwerty",
    ]
    found_password = None
    for p in dictionary_password:
        hashed_p = hash_data_md5(p)
        if hashed_p == stolen_hash_md5:
            found_password = p
            break
    if found_password:
        print(f"Cracked MD5 Hash: Original Password was {found_password}")
    else:
        print("MD5 hash not found in the dictionary")
