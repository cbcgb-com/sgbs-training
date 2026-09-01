# /// script
# dependencies = ["cryptography"]
# ///
"""Generate the ES256 keypair for the roster's self-hosted auth.

Prints:
  1. AUTH_PRIVATE_KEY — the PKCS#8 private key (set as a Convex env var
     on each deployment: `npx convex env set AUTH_PRIVATE_KEY ...`).
     Newlines are escaped as \\n so it pastes as a single line.
  2. The public JWKS, base64-encoded — paste into convex/auth.config.ts
     (provider jwks field, replacing the {{PUT_BASE64 JWKS HERE}}
     placeholder).
"""

import base64
import json
import os

from cryptography.hazmat.primitives.asymmetric.ec import (
    SECP256R1,
    derive_private_key,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)

# P-256 order (RFC 6090 / SEC1), for reducing a random scalar.
P256_ORDER = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551

private_key = derive_private_key(
    int.from_bytes(os.urandom(48), "big") % P256_ORDER, SECP256R1()
)
pem = private_key.private_bytes(
    Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()
).decode()
public_numbers = private_key.public_key().public_numbers()


def b64url_uint(n: int) -> str:
    raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


jwk = {
    "keys": [
        {
            "kty": "EC",
            "crv": "P-256",
            "x": b64url_uint(public_numbers.x),
            "y": b64url_uint(public_numbers.y),
            "use": "sig",
            "alg": "ES256",
            "kid": "sgbs-roster-session-1",
        }
    ]
}
jwks_b64 = base64.b64encode(json.dumps(jwk, separators=(",", ":")).encode()).decode()

print("=== AUTH_PRIVATE_KEY (Convex env var, one line) ===")
print(pem.replace("\n", "\\n").strip())
print()
print("=== auth.config.ts jwks value (data URI) ===")
print(f"data:application/json;base64,{jwks_b64}")
print()
print("Public JWK (for reference):")
print(json.dumps(jwk, indent=2))