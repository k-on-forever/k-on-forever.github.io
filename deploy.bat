@echo off
echo === Step 1: Upload full site ===
scp -r D:\Blog\public\* ubuntu@106.53.146.82:/var/www/html/

echo === Step 2: Verify images ===
python D:\opencode\check_server.py
