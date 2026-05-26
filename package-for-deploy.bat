@echo off
REM Hexo Blog 打包脚本 - 在本地运行
REM 将 public 目录打包为 tar.gz 以便上传到服务器

echo =========================================
echo   Hexo Blog 打包脚本
echo =========================================

cd /d D:\Blog

echo [1/2] 检查 public 目录...
if not exist "public\index.html" (
    echo 错误: 未找到 public 目录，请先运行 npm run build
    pause
    exit /b 1
)
echo ✓ public 目录已就绪

echo [2/2] 打包文件...
tar -czf blog-public.tar.gz -C public .
echo ✓ 已生成 blog-public.tar.gz

echo.
echo =========================================
echo   打包完成!
echo =========================================
echo.
echo 请将以下文件上传到服务器:
echo   1. blog-public.tar.gz
echo   2. D:\opencode\nginx-blog.conf
echo   3. D:\Blog\deploy-server.sh
echo.
echo 上传后在服务器运行:
echo   bash deploy-server.sh
echo.
pause
