import os
import stat
import tarfile
import zlib
from collections.abc import Callable, Generator
from pathlib import Path
from typing import TypeVar

from fastapi import HTTPException

T = TypeVar("T", bound=Path | None)


def resolve_artifact(resolve: Callable[..., T], *parts: str | None) -> T:
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


def _tar_entries(root: Path, chunk_size: int) -> Generator[bytes]:
    """Yield an uncompressed tar of the regular files below `root`, one chunk at a time."""
    for directory, _, files in os.walk(root):
        for file in sorted(files):
            file_path = Path(directory) / file
            file_stat = file_path.lstat()
            if not stat.S_ISREG(file_stat.st_mode):
                continue

            info = tarfile.TarInfo(str(file_path.relative_to(root)))
            info.size = file_stat.st_size
            info.mtime = int(file_stat.st_mtime)
            info.mode = stat.S_IMODE(file_stat.st_mode)
            yield info.tobuf(tarfile.PAX_FORMAT)

            remaining = info.size
            with open(file_path, "rb") as f:
                while remaining and (chunk := f.read(min(chunk_size, remaining))):
                    remaining -= len(chunk)
                    yield chunk
            # A file that shrank while being read is zero-filled, so the header stays true.
            padding = remaining + (-info.size % tarfile.BLOCKSIZE)
            while padding:
                chunk_length = min(chunk_size, padding)
                padding -= chunk_length
                yield bytes(chunk_length)

    yield bytes(2 * tarfile.BLOCKSIZE)


def tar_gz_iterator(root: Path, chunk_size: int = 64 * 1024) -> Generator[bytes]:
    """
    Stream a gzipped tar of the regular files below a directory

    Memory use is bounded by `chunk_size`, whatever the size of the files.
    Symlinks and other special files are left out.

    Parameters
    ----------
    root
        Directory to archive, which becomes the root of the archive
    chunk_size
        Size of each chunk to read from the files
    """
    compressor = zlib.compressobj(wbits=zlib.MAX_WBITS | 16)
    for data in _tar_entries(root, chunk_size):
        if compressed := compressor.compress(data):
            yield compressed
    yield compressor.flush()
