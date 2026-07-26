#!/usr/bin/env bash
# 服务器端部署脚本：git pull → 安装依赖 → 构建前端 → 重启 PM2
# 项目：hitech-web (ai.hitech.xin)
# 在项目根目录执行: bash deploy.sh
set -e

cd "$(dirname "$0")"

# 检查 .env 文件
if [ ! -f .env ]; then
  echo "❌ 未找到 .env 文件，请先执行: cp .env.example .env 并填写配置"
  exit 1
fi

echo "==> 拉取最新代码"
git pull

echo "==> 安装依赖"
npm ci --omit=dev=false

echo "==> 构建前端"
npm run build

# 验证构建产物
if [ ! -d dist ]; then
  echo "❌ 构建失败：dist 目录不存在"
  exit 1
fi

echo "==> 重启 PM2 进程"
if pm2 describe hitech-web > /dev/null 2>&1; then
  pm2 restart hitech-web
else
  pm2 start ecosystem.config.cjs
fi

echo "==> 保存 PM2 列表（开机自启）"
pm2 save

echo "✅ 部署完成 - $(date '+%Y-%m-%d %H:%M:%S')"
