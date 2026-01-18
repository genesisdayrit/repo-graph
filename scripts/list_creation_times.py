#!/usr/bin/env python3
"""List all directories and files with their creation times."""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

import pathspec


def load_gitignore_specs(directory: Path) -> dict[Path, pathspec.PathSpec]:
    """Load all .gitignore files in the directory tree.

    Returns:
        Dict mapping directory paths to their PathSpec objects.
    """
    gitignore_specs = {}

    for root, dirs, files in os.walk(directory):
        root_path = Path(root)
        gitignore_path = root_path / ".gitignore"

        if gitignore_path.exists():
            try:
                with open(gitignore_path, "r") as f:
                    spec = pathspec.PathSpec.from_lines("gitwildmatch", f)
                    gitignore_specs[root_path] = spec
            except (OSError, PermissionError):
                pass

    return gitignore_specs


def is_ignored(path: Path, base_dir: Path, gitignore_specs: dict[Path, pathspec.PathSpec]) -> bool:
    """Check if a path should be ignored based on .gitignore rules.

    Checks all applicable .gitignore files from the base directory down to the path.
    """
    # Always ignore .git directories
    if ".git" in path.parts:
        return True

    # Check each gitignore spec that could apply to this path
    for gitignore_dir, spec in gitignore_specs.items():
        # Only apply gitignore if the path is under the gitignore's directory
        try:
            rel_path = path.relative_to(gitignore_dir)
            # Add trailing slash for directories to match gitignore patterns correctly
            rel_path_str = str(rel_path)
            if path.is_dir():
                rel_path_str += "/"
            if spec.match_file(rel_path_str):
                return True
        except ValueError:
            # Path is not relative to this gitignore directory
            continue

    return False


def get_creation_time(path: Path) -> datetime:
    """Get the creation time of a file or directory.

    On macOS/Windows, uses birth time. On Linux, falls back to modification time.
    """
    stat_info = path.stat()
    # st_birthtime is available on macOS and Windows
    if hasattr(stat_info, 'st_birthtime'):
        return datetime.fromtimestamp(stat_info.st_birthtime)
    # Fallback to modification time on Linux
    return datetime.fromtimestamp(stat_info.st_mtime)


def format_datetime(dt: datetime) -> str:
    """Format datetime for display."""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def list_contents(directory: Path) -> tuple[list, list]:
    """List all directories and files in the given directory recursively.

    Respects .gitignore files at all levels of the directory tree.

    Returns:
        Tuple of (directories, files) where each is a list of (path, creation_time) tuples.
    """
    directories = []
    files = []

    # Load all .gitignore specs first
    gitignore_specs = load_gitignore_specs(directory)

    # Include the root directory itself
    try:
        creation_time = get_creation_time(directory)
        directories.append((directory, creation_time))
    except (OSError, PermissionError) as e:
        print(f"Warning: Cannot access {directory}: {e}", file=sys.stderr)

    try:
        for root, dirs, filenames in os.walk(directory):
            root_path = Path(root)

            # Filter out ignored directories (modifying dirs in-place prevents os.walk from descending into them)
            dirs[:] = [d for d in dirs if not is_ignored(root_path / d, directory, gitignore_specs)]

            for d in dirs:
                dir_path = root_path / d
                try:
                    creation_time = get_creation_time(dir_path)
                    directories.append((dir_path, creation_time))
                except (OSError, PermissionError) as e:
                    print(f"Warning: Cannot access {dir_path}: {e}", file=sys.stderr)

            for f in filenames:
                file_path = root_path / f
                if is_ignored(file_path, directory, gitignore_specs):
                    continue
                try:
                    creation_time = get_creation_time(file_path)
                    files.append((file_path, creation_time))
                except (OSError, PermissionError) as e:
                    print(f"Warning: Cannot access {file_path}: {e}", file=sys.stderr)
    except PermissionError as e:
        print(f"Error: Cannot access directory {directory}: {e}", file=sys.stderr)
        sys.exit(1)

    return directories, files


def main():
    parser = argparse.ArgumentParser(
        description="List directories and files with their creation times."
    )
    parser.add_argument(
        "directory",
        type=str,
        help="The directory to scan"
    )
    parser.add_argument(
        "--sort",
        choices=["name", "time"],
        default="name",
        help="Sort by name or creation time (default: name)"
    )

    args = parser.parse_args()

    directory = Path(args.directory).resolve()

    if not directory.exists():
        print(f"Error: Directory '{directory}' does not exist.", file=sys.stderr)
        sys.exit(1)

    if not directory.is_dir():
        print(f"Error: '{directory}' is not a directory.", file=sys.stderr)
        sys.exit(1)

    directories, files = list_contents(directory)

    # Sort results
    if args.sort == "name":
        directories.sort(key=lambda x: x[0])
        files.sort(key=lambda x: x[0])
    else:  # sort by time
        directories.sort(key=lambda x: x[1])
        files.sort(key=lambda x: x[1])

    # Print directories
    print("=" * 60)
    print("DIRECTORIES")
    print("=" * 60)
    if directories:
        for path, creation_time in directories:
            print(f"{format_datetime(creation_time)}  {path}")
    else:
        print("(none)")

    print()

    # Print files
    print("=" * 60)
    print("FILES")
    print("=" * 60)
    if files:
        for path, creation_time in files:
            print(f"{format_datetime(creation_time)}  {path}")
    else:
        print("(none)")


if __name__ == "__main__":
    main()
