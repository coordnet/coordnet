import os


def tools_fixture_file_path(filename: str) -> str:
    """Return the absolute path to a file in the subfolder `fixtures/`."""
    return os.path.join(os.path.dirname(os.path.realpath(__file__)), "fixtures/", filename)
