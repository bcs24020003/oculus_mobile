# 脚本工具说明

本目录包含系统管理和维护相关的脚本工具。

## 用户数据同步工具 (sync-auth-firestore.js)

该脚本用于同步Firebase Authentication和Firestore数据库之间的用户数据，解决两者之间可能存在的不一致问题。

### 功能特点

1. 检测并列出"孤立"的Authentication用户（在Auth中存在但在Firestore中不存在）
2. 检测并列出"孤立"的Firestore用户（在Firestore中存在但在Auth中不存在）
3. 可选择性地删除这些孤立用户数据，保持数据库一致性
4. 详细的日志输出，记录所有操作和发现的问题

### 使用说明

#### 准备工作

1. 确保已安装所需的依赖包：
   ```bash
   npm install firebase-admin
   ```

2. 设置Firebase Admin SDK凭据：
   - 方法1：设置环境变量
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"
     ```
   - 方法2：直接在脚本中加载(需取消相关代码的注释)
     ```javascript
     const serviceAccount = require('../path/to/serviceAccountKey.json');
     admin.initializeApp({
       credential: admin.credential.cert(serviceAccount)
     });
     ```

#### 执行脚本

1. 只检查数据不一致问题，不执行删除操作：
   ```bash
   node scripts/sync-auth-firestore.js
   ```

2. 检查并删除孤立的Authentication用户：
   ```bash
   DELETE_AUTH_ORPHANS=true node scripts/sync-auth-firestore.js
   ```

3. 检查并删除孤立的Firestore用户：
   ```bash
   DELETE_FIRESTORE_ORPHANS=true node scripts/sync-auth-firestore.js
   ```

4. 同时删除两种孤立用户：
   ```bash
   DELETE_AUTH_ORPHANS=true DELETE_FIRESTORE_ORPHANS=true node scripts/sync-auth-firestore.js
   ```

### 定期执行

建议将此脚本设置为定期执行的任务，以保持数据库的一致性：

1. 使用cron作业(Linux/macOS):
   ```
   # 每周日凌晨3点执行同步
   0 3 * * 0 cd /path/to/your-project && node scripts/sync-auth-firestore.js >> /path/to/logs/sync-$(date +\%Y\%m\%d).log 2>&1
   ```

2. 使用Windows任务计划程序:
   - 创建一个批处理文件 `sync-users.bat`:
     ```bat
     @echo off
     cd /d C:\path\to\your-project
     node scripts\sync-auth-firestore.js > logs\sync-%date:~0,4%%date:~5,2%%date:~8,2%.log 2>&1
     ```
   - 在任务计划程序中设置每周执行此批处理文件

### 输出说明

脚本执行后会生成类似以下的输出：

```
[INFO] 获取 Authentication 中的所有用户...
[INFO] 找到 150 个 Authentication 用户
[INFO] 获取 Firestore users 集合中的所有用户...
[INFO] 找到 35 个 Firestore users 集合用户
[INFO] 获取 Firestore students 集合中的所有用户...
[INFO] 找到 110 个 Firestore students 集合用户
[INFO] 找到 5 个孤立的 Authentication 用户
[INFO] 找到 0 个孤立的 Firestore 用户
[INFO] 开始处理孤立的 Authentication 用户...
孤立的 Authentication 用户列表：
- ABC123 (user1@example.com)
- DEF456 (user2@example.com)
...
[INFO] 跳过删除孤立的 Authentication 用户。设置 DELETE_AUTH_ORPHANS=true 环境变量以启用删除。
[INFO] 数据同步完成！

同步摘要:
------------------------------
Authentication 用户总数: 150
Firestore 用户总数: 145
孤立的 Authentication 用户: 5
孤立的 Firestore 用户: 0
------------------------------
```

### 安全注意事项

1. 该脚本涉及删除操作，请谨慎使用，建议先在测试环境验证
2. 确保服务账号具有足够的权限读取和修改用户数据
3. 默认情况下不执行删除操作，需明确设置环境变量才会执行删除
4. 建议在执行删除操作前备份相关数据 