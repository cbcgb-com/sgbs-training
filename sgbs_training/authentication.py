"""Authenticate to Google Cloud Platform using service account credentials read from environment variables."""
import os
from dotenv import load_dotenv
from contextlib import contextmanager
import tempfile

load_dotenv()


@contextmanager
def write_creds():
    """Write service account credentials to disk based on environment variables."""
    credentials = os.getenv("SGBS_TRAINING_SERVICE_ACCOUNT_JSON")
    fpath = tempfile.NamedTemporaryFile(mode="w+", delete=False)
    fpath.write(credentials)
    fpath.seek(0)
    yield fpath
    fpath.close()
