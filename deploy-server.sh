#!/bin/bash
# Hexo Blog 部署脚本 - 在服务器上运行
# 使用方法: bash deploy-server.sh

set -e

BLOG_DIR="/var/www/blog"
NGINX_CONF="/etc/nginx/conf.d/blog.conf"
BACKUP_DIR="/var/www/blog-backup-$(date +%Y%m%d%H%M%S)"

echo "========================================="
echo "  Hexo Blog 部署脚本"
echo "========================================="

# 1. 检查并安装 Nginx
echo "[1/6] 检查 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "  安装 Nginx..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y nginx
    else
        echo "  错误: 无法自动安装 Nginx，请手动安装"
        exit 1
    fi
fi
echo "  ✓ Nginx 已就绪"

# 2. 备份旧版本
echo "[2/6] 备份旧版本..."
if [ -d "$BLOG_DIR" ]; then
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$BLOG_DIR"/* "$BACKUP_DIR"/ 2>/dev/null || true
    echo "  ✓ 已备份到 $BACKUP_DIR"
fi

# 3. 创建目录
echo "[3/6] 准备目录..."
sudo mkdir -p "$BLOG_DIR"
echo "  ✓ 目录已就绪"

# 4. 解压博客文件
echo "[4/6] 部署博客文件..."
if [ -f "blog-public.tar.gz" ]; then
    sudo tar -xzf blog-public.tar.gz -C "$BLOG_DIR"
    echo "  ✓ 博客文件已解压到 $BLOG_DIR"
else
    echo "  错误: 未找到 blog-public.tar.gz"
    echo "  请先在本地运行: cd D:\\Blog && tar -czf blog-public.tar.gz -C public ."
    exit 1
fi

# 5. 配置 Nginx
echo "[5/6] 配置 Nginx..."
sudo cp nginx-blog.conf "$NGINX_CONF"
sudo nginx -t
echo "  ✓ Nginx 配置已更新"

# 6. 重启 Nginx
echo "[6/6] 重启 Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx
echo "  ✓ Nginx 已重启"

echo ""
echo "========================================="
echo "  部署完成!"
echo "========================================="
echo ""
echo "  博客地址: http://kon-forever.cloud"
echo ""
echo "  如需配置 HTTPS，请运行:"
echo "    sudo apt install certbot python3-certbot-nginx"
echo "    sudo certbot --nginx -d kon-forever.cloud -d www.kon-forever.cloud"
echo ""
