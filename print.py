import os

def print_folder_structure_and_file_contents(root_dir, no_print_file="no-print.txt", excluded_folders=None):
    """
    Prints the folder structure and the title and content of files
    with extensions not found in the no-print.txt file, excluding specified folders.

    Args:
        root_dir: The root directory to start traversing.
        no_print_file: Path to the file containing extensions to exclude.
        excluded_folders: A list of folder names to exclude (e.g., ["node_modules", ".next", "cache"]).
    """

    if excluded_folders is None:
        excluded_folders = ["node_modules", ".next", ".cache", "out"]  # Default Next.js and common exclusions

    try:
        with open(no_print_file, "r") as f:
            no_print_extensions = [line.strip().lower() for line in f]
    except FileNotFoundError:
        print(f"Warning: '{no_print_file}' not found. No extensions will be excluded.")
        no_print_extensions = []

    print("Folder Structure:")
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude specified folders
        dirnames[:] = [d for d in dirnames if d not in excluded_folders]

        level = dirpath.replace(root_dir, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(dirpath)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in filenames:
            print(f"{subindent}{f}")

    print("\n\nFile Contents:")
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude specified folders
        dirnames[:] = [d for d in dirnames if d not in excluded_folders]

        for filename in filenames:
            file_extension = os.path.splitext(filename)[1].lower()
            if file_extension not in no_print_extensions:
                file_path = os.path.join(dirpath, filename)
                try:
                    # Attempt to extract a title (this part can be customized)
                    title = filename.split(".")[0]  # Basic title extraction (filename without extension)

                    print(f"\n\n--- File: {filename} ---")
                    print(f"Title: {title}")
                    print(f"Content:")

                    with open(file_path, "r", encoding="utf-8") as f:  # Handle potential encoding issues
                        contents = f.read()
                        print(contents)

                except UnicodeDecodeError:
                    print(f"Warning: Could not decode '{filename}' as UTF-8. Skipping content display.")
                except Exception as e:
                    print(f"Error processing '{filename}': {e}")

# Example Usage:
root_directory = "."  # Replace with the directory you want to analyze
no_print_path = "no-print.txt"
# List of folders to exclude (add any others you need)
nextjs_excluded_folders = ["node_modules", ".next", ".cache", "out"]

# Example no-print.txt content:
# .json
# .png
# .ico
# .jpg
# .jpeg
# .gif
# .svg
# .exe
# .dll
# .md

print_folder_structure_and_file_contents(root_directory, no_print_path, nextjs_excluded_folders)