import os
from PIL import Image

img_dir = r'D:\Blog\public\img'
target_max = 250 * 1024  # 250KB

for f in sorted(os.listdir(img_dir)):
    fpath = os.path.join(img_dir, f)
    if not os.path.isfile(fpath):
        continue
    ext = f.rsplit('.', 1)[-1].lower()
    if ext not in ('jpg', 'jpeg', 'png'):
        continue
    size = os.path.getsize(fpath)
    if size <= target_max:
        continue
    
    try:
        img = Image.open(fpath)
        # Calculate new quality to fit within target
        quality = 70
        if ext in ('jpg', 'jpeg'):
            for q in range(70, 5, -2):
                img.save(fpath, quality=q, optimize=True)
                if os.path.getsize(fpath) <= target_max:
                    break
        elif ext == 'png':
            img = img.convert('RGB')
            for q in range(85, 10, -5):
                new_path = fpath.rsplit('.', 1)[0] + '.jpg'
                img.save(new_path, quality=q, optimize=True)
                if os.path.getsize(new_path) <= target_max:
                    os.remove(fpath)
                    print('[PNG->JPG] %s  %dKB -> %dKB' % (f, size//1024, os.path.getsize(new_path)//1024))
                    break
                else:
                    os.remove(new_path)
            continue
        
        new_size = os.path.getsize(fpath)
        print('[OK] %s  %dKB -> %dKB' % (f, size//1024, new_size//1024))
    except Exception as e:
        print('[ERR] %s: %s' % (f, e))
