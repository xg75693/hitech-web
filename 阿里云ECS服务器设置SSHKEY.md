第一步：生成 SSH key
ssh-keygen -t ed25519 -C "aliyun-ecs@hitech.xin"
遇到提示全部直接回车，共按 3 次。

---

第二步：查看公钥
cat ~/.ssh/id_ed25519.pub
复制输出的内容（整行，以 ssh-ed25519 开头）。

---

第三步：添加到 GitHub

1. 打开浏览器，登录 GitHub
2. 右上角头像 → Settings
3. 左侧菜单 → SSH and GPG keys
4. 点击绿色按钮 New SSH key
5. Title 填 aliyun-ecs
6. Key 框里粘贴第二步复制的内容
7. 点击 Add SSH key

---

第四步：测试连接
ssh -T git@github.com
看到 Hi xxx! You've successfully authenticated 表示成功。

---

第五步：拉取最新代码
cd /data/hitech/node1/app/hitech-web
git pull origin main
cp nginx.conf /etc/nginx/conf.d/nginx.conf
nginx -t && nginx -s reload