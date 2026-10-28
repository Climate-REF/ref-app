"""Tests for the chunked file reading behind the log and archive downloads."""

import io
import os
import tarfile
import tracemalloc

from ref_backend.core.file_handling import _tar_entries, file_iterator, tail_lines, tar_gz_iterator


class TestFileIterator:
    """Test the file_iterator generator."""

    def test_reassembles_full_content(self, tmp_path):
        """Chunks concatenate back into the original file content."""
        content = b"hello world, this is some file content"
        file_path = tmp_path / "sample.txt"
        file_path.write_bytes(content)

        chunks = list(file_iterator(str(file_path)))
        assert b"".join(chunks) == content

    def test_default_chunk_size(self, tmp_path):
        """The default chunk is 64KB, so downloads are not throttled by tiny reads."""
        content = b"x" * (100 * 1024)
        file_path = tmp_path / "large.txt"
        file_path.write_bytes(content)

        chunks = list(file_iterator(str(file_path)))
        assert max(len(c) for c in chunks) == 64 * 1024
        assert b"".join(chunks) == content

    def test_chunk_size_respected(self, tmp_path):
        """A file larger than one chunk yields multiple chunks, each within the chunk size."""
        content = b"x" * 2500
        file_path = tmp_path / "large.txt"
        file_path.write_bytes(content)

        chunks = list(file_iterator(str(file_path), chunk_size=1024))
        assert len(chunks) == 3
        assert [len(c) for c in chunks] == [1024, 1024, 452]
        assert b"".join(chunks) == content


class TestTailLines:
    """Test reading the end of a log file."""

    def test_returns_last_lines(self, tmp_path):
        file_path = tmp_path / "log.txt"
        file_path.write_text("\n".join(f"line {i}" for i in range(10)) + "\n")

        assert tail_lines(file_path, 3) == ["line 7", "line 8", "line 9"]

    def test_short_file_returns_every_line(self, tmp_path):
        file_path = tmp_path / "log.txt"
        file_path.write_text("only\ntwo\n")

        assert tail_lines(file_path, 5) == ["only", "two"]

    def test_empty_file(self, tmp_path):
        file_path = tmp_path / "log.txt"
        file_path.write_text("")

        assert tail_lines(file_path, 5) == []

    def test_drops_partial_first_line_when_reading_from_the_middle(self, tmp_path):
        file_path = tmp_path / "log.txt"
        file_path.write_text("a" * 100 + "\nlast\n")

        assert tail_lines(file_path, 5, max_bytes=10) == ["last"]

    def test_invalid_utf8_is_replaced(self, tmp_path):
        file_path = tmp_path / "log.txt"
        file_path.write_bytes(b"ok\n\xff bad\n")

        assert tail_lines(file_path, 5) == ["ok", "\ufffd bad"]


def _read_archive(chunks) -> dict[str, bytes]:
    with tarfile.open(fileobj=io.BytesIO(b"".join(chunks)), mode="r:gz") as tar:
        return {m.name: tar.extractfile(m).read() for m in tar.getmembers()}


class TestTarGzIterator:
    """Test streaming a directory as a tar.gz."""

    def test_round_trips_nested_files(self, tmp_path):
        long_name = "d" * 150
        (tmp_path / "plots" / long_name).mkdir(parents=True)
        (tmp_path / "diagnostic.json").write_text("{}")
        (tmp_path / "empty.txt").write_bytes(b"")
        (tmp_path / "plots" / long_name / "map.png").write_bytes(os.urandom(3000))

        archive = _read_archive(tar_gz_iterator(tmp_path, chunk_size=1024))

        assert archive == {
            "diagnostic.json": b"{}",
            "empty.txt": b"",
            f"plots/{long_name}/map.png": (tmp_path / "plots" / long_name / "map.png").read_bytes(),
        }

    def test_empty_directory(self, tmp_path):
        assert _read_archive(tar_gz_iterator(tmp_path)) == {}

    def test_leaves_out_symlinks(self, tmp_path):
        (tmp_path / "real.txt").write_text("real")
        (tmp_path / "link.txt").symlink_to(tmp_path / "real.txt")

        assert _read_archive(tar_gz_iterator(tmp_path)) == {"real.txt": b"real"}

    def test_file_that_shrinks_is_zero_filled(self, tmp_path):
        """The header records the size first, so a file that shrinks mid-read is padded to match."""
        path = tmp_path / "log.txt"
        path.write_bytes(b"x" * 5000)
        entries = _tar_entries(tmp_path, chunk_size=1024)
        next(entries)  # the header, which recorded 5000 bytes
        path.write_bytes(b"y" * 100)

        rest = list(entries)

        assert max(len(chunk) for chunk in rest) <= 1024
        assert b"".join(rest)[:5000] == b"y" * 100 + bytes(4900)

    def test_memory_does_not_grow_with_file_size(self, tmp_path):
        # Random bytes do not compress, so holding the file would show up as 4 MB.
        (tmp_path / "big.nc").write_bytes(os.urandom(4 * 1024 * 1024))

        tracemalloc.start()
        try:
            for _ in tar_gz_iterator(tmp_path, chunk_size=16 * 1024):
                pass
            _, peak = tracemalloc.get_traced_memory()
        finally:
            tracemalloc.stop()

        assert peak < 1024 * 1024
