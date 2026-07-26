# 部署到 ai.hitech.xin 指南

本项目为 Vite + React 前端 + Express 后端 + MySQL，需部署到能运行 Node.js 的 VPS。

## 架构

```
浏览器 → http://ai.hitech.xin (80) → Nginx 反代 → Node Express (127.0.0.1:3000)
                                                      ├─ 托管 dist/ 静态前端
                                                      ├─ /api/* 业务接口
                                                      └─ MySQL (127.0.0.1:3306)
                                          PM2 守护进程
```

---

## 一、服务器环境准备（VPS，假设 Ubuntu/Debian）

SSH 登录服务器后执行：

```bash
# 1. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Nginx
sudo apt install -y nginx

# 3. MySQL 8
sudo apt install -y mysql-server
sudo systemctl enable --now mysql

# 4. PM2
sudo npm install -g pm2
```

## 二、配置 MySQL

```bash
sudo mysql
```

```sql
CREATE DATABASE heyi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'heyi_app'@'localhost' IDENTIFIED BY '替换为强密码';
GRANT ALL PRIVILEGES ON heyi_db.* TO 'heyi_app'@'localhost';
-- server.ts 启动时会执行 CREATE DATABASE IF NOT EXISTS，需要 CREATE 权限
GRANT CREATE ON *.* TO 'heyi_app'@'localhost';
FLUSH PRIVILEGES;
exit;
```

> 表结构无需手动建，`server.ts` 的 `initDatabase()` 启动时自动建表。

## 三、拉取代码并首次部署

```bash
cd /var/www
sudo git clone <你的仓库地址> heyi
cd heyi

# 创建生产环境变量文件（此文件不进 git，需手动建）
cp .env.example .env
# 然后编辑 .env，填入真实的生产密钥、MySQL 密码、管理员密码
sudo nano .env

# 首次部署
bash deploy.sh
```

`.env` 必须填写的项：
- `ZHIPU_API_KEY`：生产用智谱密钥
- `MYSQL_PASSWORD`：上面设置的 heyi_app 密码
- `ADMIN_PASSWORD`：强密码

## 四、配置 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/ai.hitech.xin
```

写入：

```nginx
server {
    listen 80;
    server_name ai.hitech.xin;

    # 上传文件大小
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/ai.hitech.xin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 五、PM2 开机自启

```bash
pm2 startup        # 按提示执行返回的那条命令
pm2 save
```

## 六、DNS 解析

到域名服务商把 `ai.hitech.xin` 的 A 记录指向 VPS 公网 IP。
等待解析生效后访问 http://ai.hitech.xin 验证。

---

## 后续更新流程（每次发版）

本地推送代码后，服务器执行：

```bash
cd /var/www/heyi && bash deploy.sh
```

## 可选：启用 HTTPS

域名跑通 HTTP 后建议加证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ai.hitech.xin
```

证书自动续期，完成后 `.env` 里 `APP_URL` 改为 `https://ai.hitech.xin` 并 `pm2 restart heyi`。

## 常用运维命令

```bash
pm2 status              # 查看进程
pm2 logs heyi           # 实时日志
pm2 restart heyi        # 重启
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```
