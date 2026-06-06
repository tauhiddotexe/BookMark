import logging
import requests
from urllib3.util import Retry
from requests.adapters import HTTPAdapter

logger = logging.getLogger("api.services.http_client")

def get_session_with_retries() -> requests.Session:
    """
    Returns a requests.Session configured with standard exponential backoff retries
    to resiliently handle transient errors and rate limiting (429, 500, 502, 503, 504).
    """
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        raise_on_status=False
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

def safe_request_json(method: str, url: str, **kwargs) -> dict | None:
    """
    Executes a safe request and returns JSON response, returning None on failure
    after all retries are exhausted.
    """
    session = kwargs.pop("session", None) or get_session_with_retries()
    timeout = kwargs.pop("timeout", 8)
    
    try:
        resp = session.request(method, url, timeout=timeout, **kwargs)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.warning(
            "API request failed after retries method=%s url=%s error=%s",
            method, url, exc,
            extra={"url": url, "method": method}
        )
        return None
