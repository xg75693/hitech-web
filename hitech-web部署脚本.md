
# ========================================
# hitech-web(和毅官网-AI智能助手) 完整部署脚本
# 架构：Vite + React 前端 + Express 后端(:3000) + MySQL
# Nginx 反向代理 → Node Express (127.0.0.1:3000)
# ========================================

# ---- 路径变量 ----
TRUNK_DIR="/data/hitech/node1/trunk"
DEPLOY_DIR="/data/hitech/node1/app"
APP_NAME="hitech-web"
APP_DIR="${DEPLOY_DIR}/${APP_NAME}"
GIT_REPO="https://github.com/xg75693/hitech-web.git"
ARCHIVE_FILE="${TRUNK_DIR}/${APP_NAME}.tar.gz"

echo "=== hitech-web 部署开始 ==="

# ========================================
# 0. 停止现有服务
# ========================================
echo "[1/5] 停止现有服务..."
pm2 stop hitech-web 2>/dev/null
pm2 delete hitech-web 2>/dev/null

# 清理旧代码
rm -rf ${TRUNK_DIR}/${APP_NAME}
rm -rf ${APP_DIR}

# ========================================
# 1. 获取代码（优先使用本地 tar 包，否则 git clone）
# ========================================
echo "[2/5] 获取代码..."
mkdir -p ${TRUNK_DIR}
cd ${TRUNK_DIR}

if [ -f "${ARCHIVE_FILE}" ]; then
  echo "       使用本地归档: ${ARCHIVE_FILE}"
  mkdir -p ${APP_NAME}
  tar -xzf "${ARCHIVE_FILE}" -C ${APP_NAME} --strip-components=1
  rm -f "${ARCHIVE_FILE}"
elif command -v git >/dev/null 2>&1; then
  echo "       通过 Git 拉取..."
  if ! git clone -b main ${GIT_REPO}; then
    echo "❌ Git 拉取失败，且未找到本地归档 ${ARCHIVE_FILE}"
    echo "   请在本能访问 GitHub 的机器上执行："
    echo "   git archive --format=tar.gz --prefix=hitech-web/ -o hitech-web.tar.gz HEAD"
    echo "   scp hitech-web.tar.gz root@<服务器IP>:${TRUNK_DIR}/"
    exit 1
  fi
else
  echo "❌ 未找到本地归档 ${ARCHIVE_FILE}，且服务器未安装 git"
  exit 1
fi

# ========================================
# 2. 复制到部署目录
# ========================================
echo "       复制到部署目录..."
sudo mkdir -p ${APP_DIR} && sudo chmod 755 ${APP_DIR}
cp -rT ${TRUNK_DIR}/${APP_NAME} ${APP_DIR}

# ========================================
# 3. 配置环境变量
# ========================================
echo "[3/5] 配置环境变量..."
cd ${APP_DIR}

mv .env.production .env

# ========================================
# 4. 安装依赖 & 构建前端
# ========================================
echo "[4/5] 安装依赖并构建前端..."
cd ${APP_DIR}
npm ci

npm run build

# 验证构建产物
if [ ! -d dist ]; then
  echo "❌ 构建失败：dist 目录不存在，请检查构建日志"
  exit 1
fi

# ========================================
# 5. 启动 Node.js 服务（PM2）
# ========================================
echo "[5/5] 启动 PM2 进程..."
cd ${APP_DIR}
NODE_ENV=production pm2 start ecosystem.config.cjs
pm2 save

# ========================================
# 6. 验证服务
# ========================================
echo "[6/6] 验证服务..."
sleep 3

echo "--- Node.js 服务健康检查 ---"
curl -s http://localhost:3000/api/stats || echo "（接口检查失败，请查看日志）"
echo ""

pm2 list

echo "=== hitech-web 部署完成 - $(date '+%Y-%m-%d %H:%M:%S') ==="


# ========================================
# 7. 更新 Nginx 站点配置（统一使用 conf.d/nginx.conf）
# ========================================
# 使用 \cp -f 绕过 root 的 cp -i 别名，强制覆盖不询问
### \cp -f /data/hitech/node1/app/hitech-web/nginx.conf /etc/nginx/conf.d/nginx.conf

# 清理历史遗留的重复配置（避免 server name 冲突警告）
### rm -f /etc/nginx/conf.d/heyi.conf

sudo nginx -t && sudo systemctl reload nginx

echo "=== hitech-web 部署完成 ==="
# ========================================
