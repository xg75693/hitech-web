#!/usr/bin/env bash
# 服务器端部署脚本：git pull → 安装依赖 → 构建前端 → 重启 PM2
# 在项目根目录执行: bash deploy.sh
set -e

cd "$(dirname "$0")"

echo "==> 拉取最新代码"
git pull

echo "==> 安装依赖"
npm install

echo "==> 构建前端"
npm run build

echo "==> 重启 PM2 进程"
if pm2 describe heyi > /dev/null 2>&1; then
  pm2 restart heyi
else
  pm2 start ecosystem.config.cjs
fi

echo "==> 保存 PM2 列表（开机自启）"
pm2 save

echo "✅ 部署完成"
