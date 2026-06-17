import os
import re
import json

base_dir = r"c:\Users\spars\Desktop\Epsilon\frontend\src\app"

audit = []

def extract_interactive(filepath, route):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    buttons = re.findall(r'<button[^>]*>(.*?)</button>', content, re.DOTALL)
    links = re.findall(r'<NextLink[^>]*href=["\'](.*?)["\'][^>]*>(.*?)</NextLink>', content, re.DOTALL)
    links += re.findall(r'<a[^>]*href=["\'](.*?)["\'][^>]*>(.*?)</a>', content, re.DOTALL)
    
    # Also find inputs/selects
    inputs = re.findall(r'<input[^>]*>', content)
    selects = re.findall(r'<select[^>]*>', content)
    
    audit.append({
        "route": route,
        "buttons": [re.sub(r'<[^>]+>', '', b).strip() for b in buttons if b.strip()],
        "links": [l[1] for l in links],
        "inputs": len(inputs),
        "selects": len(selects)
    })

routes = [
    ("/", "page.tsx"),
    ("/login", "login/page.tsx"),
    ("/onboarding", "onboarding/page.tsx"),
    ("/app", "app/page.tsx"),
    ("/app/data-sources", "app/data-sources/page.tsx"),
    ("/app/customer-360", "app/customer-360/page.tsx"),
    ("/app/segments", "app/segments/page.tsx"),
    ("/app/campaigns", "app/campaigns/page.tsx"),
    ("/app/creative-studio", "app/creative-studio/page.tsx"),
    ("/app/experiments", "app/experiments/page.tsx"),
    ("/app/model-ops", "app/model-ops/page.tsx"),
    ("/app/audit-logs", "app/audit-logs/page.tsx"),
    ("/app/team", "app/team/page.tsx"),
    ("/app/billing", "app/billing/page.tsx"),
    ("/app/settings", "app/settings/page.tsx"),
    ("/app/profile", "app/profile/page.tsx"),
    ("Sidebar & Topbar", "app/layout.tsx"),
]

for route, path in routes:
    extract_interactive(os.path.join(base_dir, path.replace('/', '\\')), route)

with open('audit_dump.json', 'w') as f:
    json.dump(audit, f, indent=2)
