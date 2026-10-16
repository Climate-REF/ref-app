import os
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


def tail_lines(file_path: Path, lines: int, max_bytes: int = 64 * 1024) -> list[str]:
    """
    Read the last lines of a text file without reading all of it

    Parameters
    ----------
    file_path
        Path to the file to read
    lines
        Maximum number of lines to return
    max_bytes
        Maximum number of bytes to read from the end of the file

    Returns
    -------
    :
        Up to ``lines`` lines from the end of the file, without their line endings
    """
    with open(file_path, "rb") as file:
        size = file.seek(0, os.SEEK_END)
        start = max(0, size - max_bytes)
        file.seek(start)
        chunk = file.read()

    all_lines = chunk.decode("utf-8", errors="replace").splitlines()
    if start > 0 and all_lines:
        # The read most likely started part way through a line
        all_lines = all_lines[1:]

    return all_lines[-lines:] if lines > 0 else []


def file_iterator(file_path: str, chunk_size: int = 64 * 1024) -> Generator[bytes]:
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
