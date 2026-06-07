import os

files_to_remove = [
    "check_init_state.py",
    "check_init_state_detail.py",
    "check_maps_links.py",
    "check_meta.py",
    "find_coords_in_html.py",
    "find_data_params.py",
    "search_coords_response.py",
    "search_response.html",
    "temp_response.html",
    "test_coords.py",
    "test_formats.py",
    "test_google_search.py",
    "test_nominatim.py",
    "test_parallel_playwright.py",
    "test_parallel_playwright_v2.py",
    "test_place_url.py",
    "top30.txt",
    "parse_html_coords.py",
    "generate_database.py",
    "export_csv.py"
]

print("Starting cleanup process...")

for f in files_to_remove:
    if os.path.exists(f):
        try:
            os.remove(f)
            print(f"Removed temporary file: {f}")
        except Exception as e:
            print(f"Error removing {f}: {e}")

print("Cleanup complete!")

