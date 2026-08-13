from collections.abc import Callable, Generator
from pathlib import Path

from fastapi import HTTPException


def resolve_artifact(resolve: Callable[..., Path], *parts: str) -> Path:
    """
    Call an ``ArtifactsReader`` resolver and turn a containment failure into a 404.

    A path that escapes the results root means the recorded fragment or filename is bad,
    so the resolved path is never reported back to the caller.

    Parameters
    ----------
    resolve
        Bound ``ArtifactsReader`` method, such as ``artifacts.log_file``
    parts
        Arguments to pass to the resolver
    """
    try:
        return resolve(*parts)
    except ValueError:
        raise HTTPException(status_code=404, detail="Execution output not found")


def file_iterator(file_path: str, chunk_size: int = 1024) -> Generator[bytes]:
    """
    Read a file in chunks

    Parameters
    ----------
    file_path
        Path to the file to read
    chunk_size
        Size of each chunk to read from the file
    """
    with open(file_path, "rb") as file:
        while chunk := file.read(chunk_size):
            yield chunk
