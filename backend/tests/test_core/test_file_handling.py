"""Tests for chunked file reading used by the log-download endpoint."""

from ref_backend.core.file_handling import file_iterator, tail_lines


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
