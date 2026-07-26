
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

# 若已有 .env 则跳过（保留生产配置）
if [ ! -f .env ]; then
  echo "❌ 未找到 .env 文件，请先创建并填写以下配置后重新执行："
  echo "   ZHIPU_API_KEY=5a5645970077454294c60a66949938d5.PKlbntbtKliriadG"
  echo "   ZHIPU_MODEL=glm-4.5-air"
  echo "   MYSQL_HOST=127.0.0.1"
  echo "   MYSQL_PORT=3306"
  echo "   MYSQL_USER=hitech_user"
  echo "   MYSQL_PASSWORD=Hitech@2026!"
  echo "   MYSQL_DATABASE=hitech"
  echo "   ADMIN_USERNAME=admin"
  echo "   ADMIN_PASSWORD=hitech"
  echo "   PORT=3000"
  exit 1
fi

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
# 附录：离线部署说明（服务器无法访问 GitHub 时使用）
# ========================================
# 在能访问 GitHub 的机器上执行：
#   cd /path/to/hitech-web
#   git archive --format=tar.gz --prefix=hitech-web/ -o hitech-web.tar.gz HEAD
#   scp hitech-web.tar.gz root@<服务器IP>:/data/hitech/node1/trunk/
#
# 然后在服务器上执行本脚本即可，脚本会自动识别并解压 tar 包。

# ========================================
# 附录：Nginx 反向代理配置
# ========================================
# sudo nano /etc/nginx/sites-available/ai.hitech.xin
#
# server {
#     listen 80;
#     server_name ai.hitech.xin;
#     client_max_body_size 20m;
#
#     location / {
#         proxy_pass http://127.0.0.1:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#     }
# }
#
# sudo ln -s /etc/nginx/sites-available/ai.hitech.xin /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx

# ========================================
# 附录：数据库初始化（首次部署时执行）
# ========================================
# sudo mysql
#
# CREATE DATABASE hitech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# CREATE USER 'hitech_user'@'%' IDENTIFIED BY 'Hitech@2026!';
# GRANT ALL PRIVILEGES ON hitech.* TO 'hitech_user'@'%';
# GRANT CREATE ON *.* TO 'hitech_user'@'%';
# FLUSH PRIVILEGES;
# exit;
#
# 注：表结构无需手动建，server.ts 的 initDatabase() 启动时自动建表。
# 若用户无 CREATE DATABASE 权限，server.ts 会在数据库已存在时跳过该步骤。

# ========================================
# 附录：常用运维命令
# ========================================

# 查看日志
# pm2 logs hitech-web

# 重启 / 停止
# pm2 restart hitech-web
# pm2 stop hitech-web

# 查看进程状态
# pm2 status

# Nginx 操作
# sudo nginx -t && sudo systemctl reload nginx
# sudo tail -f /var/log/nginx/error.log

# 启用 HTTPS（域名 HTTP 跑通后）
# sudo apt install -y certbot python3-certbot-nginx
# sudo certbot --nginx -d ai.hitech.xin
