"""Authenticate to Google Cloud Platform using service account credentials read from environment variables."""
import os
from dotenv import load_dotenv
from pyprojroot import here
import json

load_dotenv()

def write_creds():
    """Write service account credentials to disk based on environment variables."""
    credentials = {
        "type": "service_account",
        "project_id": os.getenv("GOOGLE_PROJECT_ID"),
        "private_key_id": os.getenv("GOOGLE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("GOOGLE_PRIVATE_KEY"),
        "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
        "client_id": os.getenv("GOOGLE_CLIENT_EMAIL"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.getenv("GOOGLE_CLIENT_X509_CERT_URL")
    }
    with open(here() / os.getenv("GOOGLE_CREDENTIALS_FILENAME"), "w+") as f:
        f.write(json.dumps(credentials))
