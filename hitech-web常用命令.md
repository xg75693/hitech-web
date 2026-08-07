# 更新发布
cd /data/hitech/node1/app/hitech-web && bash deploy.sh

# 复制SSL证书
## 更新Nginx配置
\cp -f /data/hitech/node1/app/hitech-web/nginx.conf /etc/nginx/conf.d/nginx.conf
## 创建SSL证书文件夹并复制
mkdir -p /data/hitech/cert/
cp /data/hitech/node1/app/hitech-web/ssl/ai.hitech.xin.* /data/hitech/cert/
## 同时设置证书文件权限：
chmod 600 /data/hitech/cert/ai.hitech.xin.key
chmod 644 /data/hitech/cert/ai.hitech.xin.pem
## 复制完成后，验证文件存在：
ls -la /data/hitech/cert/
## 然后重载 nginx：
sudo nginx -t && sudo nginx -s reload

# 更新Nginx配置
cd /data/hitech/node1/app/hitech-web
git pull origin main
\cp nginx.conf /etc/nginx/conf.d/nginx.conf
nginx -t && nginx -s reload


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
