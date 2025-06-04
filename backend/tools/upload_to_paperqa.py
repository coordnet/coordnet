#!/usr/bin/env python
"""
Script to upload files to a PaperQA collection using the API.

This script allows you to:
1. Upload files to a PaperQA collection
2. Create a collection if it doesn't exist
3. Process folders of files recursively
4. Show progress with a progress bar
5. Automatically try HTTP if HTTPS fails
6. Interactively enter hostname, collection name, and files if not provided
7. Uses JWT authentication for secure API access
8. Skip updating the index after each file and update it once at the end

Usage:
    python upload_to_paperqa.py --hostname example.com --collection my-collection
                                --files /path/to/files
    python upload_to_paperqa.py  # Fully interactive mode

You can also specify the protocol in the hostname:
    python upload_to_paperqa.py --hostname http://example.com --collection my-collection
                                --files /path/to/files

Or use the --protocol argument:
    python upload_to_paperqa.py --hostname example.com --protocol http --collection my-collection
                                --files /path/to/files

To skip updating the index after each file (useful for bulk uploads):
    python upload_to_paperqa.py --hostname example.com --collection my-collection
                                --files /path/to/files --skip-index-update
"""

import argparse
import getpass
import sys
from pathlib import Path
from typing import Any

import requests
from tqdm import tqdm


def get_hostname(args: argparse.Namespace) -> tuple[str, str]:
    """Get the hostname and protocol from args or interactively."""
    protocol = args.protocol

    if args.hostname:
        # Check if hostname includes protocol
        if args.hostname.startswith(("http://", "https://")):
            parts = args.hostname.split("://")
            protocol = parts[0]
            hostname = parts[1]
            return hostname, protocol
        return args.hostname, protocol

    # Interactive mode
    hostname_input = input("Enter API hostname (e.g., example.com or https://example.com): ")
    if not hostname_input:
        print("Hostname is required.")
        sys.exit(1)

    # Check if hostname includes protocol
    if hostname_input.startswith(("http://", "https://")):
        parts = hostname_input.split("://")
        protocol = parts[0]
        hostname = parts[1]
        return hostname, protocol

    return hostname_input, protocol


def get_auth_token(hostname: str, protocol: str = "https") -> str:
    """Get authentication token from user."""
    username = input("Username: ")
    password = getpass.getpass("Password: ")

    # Try with the provided protocol first
    url = f"{protocol}://{hostname}/api/auth/jwt/"
    try:
        response = requests.post(url, json={"email": username, "password": password})
        response.raise_for_status()
        return response.json()["access"]
    except requests.exceptions.RequestException as e:
        # If HTTPS fails, try HTTP (only if we were using HTTPS)
        if protocol == "https":
            print(f"Authentication with HTTPS failed: {e}")
            print("Trying with HTTP instead...")
            try:
                url = f"http://{hostname}/api/auth/jwt/"
                response = requests.post(url, json={"email": username, "password": password})
                response.raise_for_status()
                return response.json()["access"]
            except requests.exceptions.RequestException as e2:
                print(f"Authentication with HTTP also failed: {e2}")
                sys.exit(1)
        else:
            print(f"Authentication failed: {e}")
            print(f"{e.response.text}")
            sys.exit(1)


def make_api_request(method, url, protocol, hostname, **kwargs):
    """Make an API request."""
    full_url = f"{protocol}://{hostname}{url}"
    try:
        if method == "get":
            response = requests.get(full_url, **kwargs)
        elif method == "post":
            response = requests.post(full_url, **kwargs)
        else:
            raise ValueError(f"Unsupported method: {method}")

        response.raise_for_status()
        return response
    except requests.exceptions.RequestException as exc:
        print(f"Request failed: {exc}")
        raise


def get_collection(
    hostname: str, token: str, collection_name: str, protocol: str = "https"
) -> dict[str, Any] | None:
    """Get a collection by name, return None if it doesn't exist."""
    url = f"/api/tools/paperqa-collections/?name={collection_name}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = make_api_request("get", url, protocol, hostname, headers=headers)
        results = response.json()["results"]
        return results[0] if results else None
    except requests.exceptions.RequestException as e:
        print(f"Failed to get collection: {e}")
        sys.exit(1)


def create_collection(
    hostname: str, token: str, collection_name: str, protocol: str = "https"
) -> dict[str, Any]:
    """Create a new collection."""
    url = "/api/tools/paperqa-collections/"
    headers = {"Authorization": f"Bearer {token}"}
    data = {"name": collection_name}

    try:
        # Use form data instead of JSON for collection creation
        response = make_api_request(
            "post",
            url,
            protocol,
            hostname,
            json=data,
            headers=headers,
        )
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Failed to create collection: {e}")
        sys.exit(1)


def upload_file(
    hostname: str, token: str, file_path: Path, protocol: str = "https"
) -> dict[str, Any]:
    """Upload a file to the server and return the upload object."""
    url = "/api/uploads/"
    headers = {"Authorization": f"Bearer {token}"}

    # Determine content type based on file extension
    content_type = "application/pdf"  # Default
    if file_path.suffix.lower() == ".txt":
        content_type = "text/plain"
    elif file_path.suffix.lower() in [".doc", ".docx"]:
        content_type = "application/msword"

    with open(file_path, "rb") as f:
        files = {"file": (file_path.name, f, content_type)}
        try:
            response = make_api_request(
                "post",
                url,
                protocol,
                hostname,
                data={"name": file_path.name},
                files=files,
                headers=headers,
            )
            if response.status_code >= 200 and response.status_code < 300:
                print(f"File {file_path} uploaded successfully.")
                return response.json()
            return {}
        except requests.exceptions.RequestException as e:
            print(f"Failed to upload file {file_path}: {e}")
            if hasattr(e, "response") and hasattr(e.response, "text"):
                print(f"Server response: {e.response.text}")
            return {}


def add_upload_to_collection(  # noqa: PLR0913
    hostname: str,
    token: str,
    collection_id: str,
    upload_id: str,
    protocol: str = "https",
    skip_index_update: bool = False,
) -> bool:
    """Add an upload to a collection."""
    url = f"/api/tools/paperqa-collections/{collection_id}/add_upload/"
    headers = {"Authorization": f"Bearer {token}"}
    data = {"upload_id": upload_id, "skip_index_update": skip_index_update}

    try:
        make_api_request("post", url, protocol, hostname, json=data, headers=headers)
        return True
    except requests.exceptions.RequestException as e:
        print(f"Failed to add upload to collection: {e}")
        return False


def update_collection_index(
    hostname: str, token: str, collection_id: str, protocol: str = "https"
) -> bool:
    """Manually update the index for a collection."""
    url = f"/api/tools/paperqa-collections/{collection_id}/update_index/"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        make_api_request("post", url, protocol, hostname, headers=headers)
        print("Index update triggered successfully.")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Failed to trigger index update: {e}")
        return False


def get_collection_files(
    hostname: str, token: str, collection_id: str, protocol: str = "https"
) -> list[str]:
    """Get a list of filenames already in the collection."""
    url = f"/api/tools/paperqa-collections/{collection_id}/files/"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = make_api_request("get", url, protocol, hostname, headers=headers)
        return [file["name"] for file in response.json()]
    except requests.exceptions.RequestException as e:
        print(f"Failed to get collection files: {e}")
        return []


def process_file(  # noqa: PLR0913
    hostname: str,
    token: str,
    collection_id: str,
    file_path: Path,
    progress_bar: tqdm | None = None,
    protocol: str = "https",
    skip_existing: bool = False,
    existing_files: list[str] | None = None,
    skip_index_update: bool = False,
) -> bool:
    """Process a single file: upload it and add to collection."""
    # Check for supported file types
    supported_extensions = [".pdf", ".txt", ".doc", ".docx"]
    if file_path.suffix.lower() not in supported_extensions:
        if progress_bar:
            progress_bar.write(f"Skipping unsupported file type: {file_path}")
        return False

    # Skip existing files if requested
    if skip_existing and existing_files is not None and file_path.name in existing_files:
        if progress_bar:
            progress_bar.write(f"Skipping existing file: {file_path.name}")
        return True

    # Upload the file
    if progress_bar:
        progress_bar.write(f"Uploading {file_path}")
    upload = upload_file(hostname, token, file_path, protocol)
    if not upload:
        return False

    # Add the upload to the collection
    if progress_bar:
        progress_bar.write(f"Adding {file_path.name} to collection")
    return add_upload_to_collection(
        hostname, token, collection_id, upload["id"], protocol, skip_index_update
    )


def process_files(  # noqa: PLR0913
    hostname: str,
    token: str,
    collection_id: str,
    file_paths: list[Path],
    protocol: str = "https",
    skip_existing: bool = False,
    skip_index_update: bool = False,
) -> None:
    """Process multiple files with a progress bar."""
    # Get existing files if we need to skip them
    existing_files = []
    if skip_existing:
        progress_bar = tqdm(total=1, desc="Getting existing files")
        existing_files = get_collection_files(hostname, token, collection_id, protocol)
        progress_bar.update(1)
        progress_bar.close()
        print(f"Found {len(existing_files)} existing files in the collection")

    with tqdm(total=len(file_paths), desc="Processing files") as progress_bar:
        for file_path in file_paths:
            if file_path.is_file():
                process_file(
                    hostname,
                    token,
                    collection_id,
                    file_path,
                    progress_bar,
                    protocol,
                    skip_existing,
                    existing_files,
                    skip_index_update,
                )
            else:
                progress_bar.write(f"Skipping non-file: {file_path}")
            progress_bar.update(1)

    # If we skipped index updates, trigger a manual update at the end
    if skip_index_update:
        print("Triggering manual index update...")
        update_collection_index(hostname, token, collection_id, protocol)


def collect_files(paths: list[str]) -> list[Path]:
    """Collect all files from the given paths, including directories recursively."""
    all_files = []

    for path_str in paths:
        path = Path(path_str)
        if path.is_file():
            all_files.append(path)
        elif path.is_dir():
            # Recursively add all files from the directory
            for file_path in path.glob("**/*"):
                if file_path.is_file():
                    all_files.append(file_path)
        else:
            print(f"Warning: {path} is not a file or directory, skipping.")

    return all_files


def get_collection_name(args: argparse.Namespace) -> str:
    """Get the collection name from args or interactively."""
    if args.collection:
        return args.collection

    # Interactive mode
    collection_name = input("Enter collection name: ")
    if not collection_name:
        print("Collection name is required.")
        sys.exit(1)

    return collection_name


def get_files_to_upload(args: argparse.Namespace) -> list[str]:
    """Get the files to upload from args or interactively."""
    if args.files:
        return args.files

    # Interactive mode
    files_input = input("Enter files or directories to upload (space-separated): ")
    if not files_input:
        print("At least one file or directory is required.")
        sys.exit(1)

    return files_input.split()


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Upload files to a PaperQA collection.")
    parser.add_argument("--hostname", help="API hostname (e.g., example.com)")
    parser.add_argument("--collection", help="Collection name")
    parser.add_argument("--files", nargs="+", help="Files or directories to upload")
    parser.add_argument(
        "--protocol",
        default="https",
        choices=["http", "https"],
        help="Protocol to use (default: https)",
    )
    parser.add_argument(
        "--skip-existing", action="store_true", help="Skip files that are already in the collection"
    )
    parser.add_argument(
        "--skip-index-update",
        action="store_true",
        help="Skip updating the index after each file, update once at the end",
    )

    args = parser.parse_args()

    # Get hostname and protocol (from args or interactively)
    hostname, protocol = get_hostname(args)

    # Get authentication token
    token = get_auth_token(hostname, protocol)

    # Get collection name (from args or interactively)
    collection_name = get_collection_name(args)

    # Get or create collection
    collection = get_collection(hostname, token, collection_name, protocol)
    if not collection:
        print(f"Collection '{collection_name}' not found. Creating...")
        collection = create_collection(hostname, token, collection_name, protocol)

    print(f"Using collection: {collection['name']} (ID: {collection['id']})")

    # Get files to upload (from args or interactively)
    file_paths = get_files_to_upload(args)

    # Collect all files to process
    files = collect_files(file_paths)
    print(f"Found {len(files)} files to process")

    # Process files with progress bar
    process_files(
        hostname,
        token,
        collection["id"],
        files,
        protocol,
        args.skip_existing,
        args.skip_index_update,
    )

    print("Done!")


if __name__ == "__main__":
    main()
