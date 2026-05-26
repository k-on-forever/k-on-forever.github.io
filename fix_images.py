import re, os, urllib.request

posts_dir = r"D:\Blog\source\_posts"
img_dir = r"D:\Blog\source\img"

total = 0

for fname in os.listdir(posts_dir):
    if not fname.endswith(".md"):
        continue
    fpath = os.path.join(posts_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    urls = re.findall(r'!\[[^\]]*\]\((https?://i-blog\.csdnimg\.cn/[^\)]+)\)', content)
    if not urls:
        continue

    print(f"\nProcessing: {fname} ({len(urls)} images)")

    for url in urls:
        ext = url.split(".")[-1].split("?")[0]
        if ext not in ("png", "jpg", "jpeg", "gif", "webp", "svg"):
            ext = "png"
        name = re.sub(r'[^a-zA-Z0-9]', '_', url.split("/")[-1].split("?")[0])
        name = name[:50] + "." + ext
        save_path = os.path.join(img_dir, name)

        if not os.path.exists(save_path):
            try:
                urllib.request.urlretrieve(url, save_path)
                print(f"  Downloaded: {name}")
            except Exception as e:
                print(f"  FAILED: {e}")
                continue

        content = content.replace(url, f"/img/{name}")
        total += 1

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  Updated: {fname}")

# Also fix the Typora local path
for fname in os.listdir(posts_dir):
    if not fname.endswith(".md"):
        continue
    fpath = os.path.join(posts_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    local_matches = re.findall(r'!\[[^\]]*\]\((C:\\[^\)]+)\)', content)
    for local_path in local_matches:
        if os.path.exists(local_path):
            ext = local_path.split(".")[-1]
            name = os.path.basename(local_path)
            save_path = os.path.join(img_dir, name)
            if not os.path.exists(save_path):
                import shutil
                shutil.copy2(local_path, save_path)
                print(f"  Copied local: {name}")
            content = content.replace(local_path, f"/img/{name}")
            total += 1
        else:
            print(f"  WARN: Local file not found: {local_path}")

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)

print(f"\nDone! Updated {total} image references.")
