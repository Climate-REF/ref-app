from collections.abc import Generator


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
