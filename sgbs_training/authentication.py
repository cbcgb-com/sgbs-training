"""Authenticate to Google Cloud Platform using service account credentials read from environment variables."""

import os
from dotenv import load_dotenv
from contextlib import contextmanager
import tempfile

load_dotenv()


@contextmanager
def write_creds():
    """Write service account credentials to disk based on environment variables or JSON file."""
    credentials = os.getenv("SGBS_TRAINING_SERVICE_ACCOUNT_JSON")

    # If environment variable is not set, try to read from JSON file
    if credentials is None:
        json_file_path = "cbcgb-com-sgbs-training-da089ae33908.json"
        if os.path.exists(json_file_path):
            with open(json_file_path, "r") as f:
                credentials = f.read()
        else:
            raise ValueError(
                "Neither SGBS_TRAINING_SERVICE_ACCOUNT_JSON environment variable nor JSON file found"
            )

    fpath = tempfile.NamedTemporaryFile(mode="w+", delete=False)
    fpath.write(credentials)
    fpath.seek(0)
    yield fpath
    fpath.close()
