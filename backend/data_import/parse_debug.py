import sys
from bs4 import BeautifulSoup
from pathlib import Path

# Force UTF-8 encoding on stdout
sys.stdout.reconfigure(encoding='utf-8')

html_path = Path(__file__).parent.parent.parent / "tools" / "data_pipeline" / "debug_page.html"
if not html_path.exists():
    print("File not found:", html_path)
    exit()

print("Loading HTML...")
raw_html = html_path.read_text(encoding="utf-8")
print("Raw HTML length:", len(raw_html))

soup = BeautifulSoup(raw_html, "html.parser")

print("\n--- Links with /groups/ ---")
links = soup.find_all("a")
for idx, a in enumerate(links):
    href = a.get("href") or ""
    if "/groups/" in href:
        text = a.get_text().strip()
        role = a.get("role") or ""
        # Check parents for role
        parent_roles = []
        p = a.parent
        while p and len(parent_roles) < 3:
            p_role = p.get("role") or p.get("class")
            if p_role:
                parent_roles.append(f"{p.name}[{p_role}]")
            p = p.parent
        print(f"[{idx}] Text: '{text}' | Href: '{href}' | Role: '{role}' | Parents: {parent_roles}")

