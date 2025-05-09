const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  listUsers, 
  getUser, 
  deleteUser 
} = require('firebase-admin/auth');
const { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  writeBatch
} = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK
// 注意：需要先设置环境变量 GOOGLE_APPLICATION_CREDENTIALS 指向你的服务账号密钥文件
// 或者使用下面的方式直接加载密钥文件
// const serviceAccount = require('../path/to/serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

try {
  admin.initializeApp();
} catch (error) {
  console.log('Firebase admin already initialized');
}

const auth = getAuth();
const db = getFirestore();

// 定义日志输出函数
const logInfo = (message) => console.log(`[INFO] ${message}`);
const logWarning = (message) => console.warn(`[WARNING] ${message}`);
const logError = (message) => console.error(`[ERROR] ${message}`);

// 获取 Authentication 中的所有用户
async function getAllAuthUsers() {
  try {
    logInfo('获取 Authentication 中的所有用户...');
    const usersResult = await auth.listUsers();
    logInfo(`找到 ${usersResult.users.length} 个 Authentication 用户`);
    return usersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      }
    }));
  } catch (error) {
    logError(`获取 Authentication 用户失败: ${error.message}`);
    throw error;
  }
}

// 获取 Firestore 中 users 集合的所有用户
async function getAllFirestoreUsers() {
  try {
    logInfo('获取 Firestore users 集合中的所有用户...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        uid: doc.id,
        ...doc.data(),
        collection: 'users'
      });
    });
    logInfo(`找到 ${users.length} 个 Firestore users 集合用户`);
    return users;
  } catch (error) {
    logError(`获取 Firestore users 用户失败: ${error.message}`);
    throw error;
  }
}

// 获取 Firestore 中 students 集合的所有用户
async function getAllFirestoreStudents() {
  try {
    logInfo('获取 Firestore students 集合中的所有用户...');
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const students = [];
    studentsSnapshot.forEach(doc => {
      students.push({
        uid: doc.id,
        ...doc.data(),
        collection: 'students'
      });
    });
    logInfo(`找到 ${students.length} 个 Firestore students 集合用户`);
    return students;
  } catch (error) {
    logError(`获取 Firestore students 用户失败: ${error.message}`);
    throw error;
  }
}

// 删除 Firestore 中的用户文档
async function deleteFirestoreUser(uid, collectionName) {
  try {
    await deleteDoc(doc(db, collectionName, uid));
    logInfo(`已从 Firestore ${collectionName} 集合中删除用户 ${uid}`);
    return true;
  } catch (error) {
    logError(`从 Firestore ${collectionName} 集合删除用户 ${uid} 失败: ${error.message}`);
    return false;
  }
}

// 删除 Authentication 中的用户
async function deleteAuthUser(uid) {
  try {
    await auth.deleteUser(uid);
    logInfo(`已从 Authentication 中删除用户 ${uid}`);
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      logWarning(`Authentication 中不存在用户 ${uid}`);
      return true;
    }
    logError(`从 Authentication 删除用户 ${uid} 失败: ${error.message}`);
    return false;
  }
}

// 检查并修复数据不一致问题
async function syncUsersData() {
  try {
    // 1. 获取所有用户数据
    const authUsers = await getAllAuthUsers();
    const firestoreUsers = await getAllFirestoreUsers();
    const firestoreStudents = await getAllFirestoreStudents();
    
    // 合并所有 Firestore 用户
    const allFirestoreUsers = [...firestoreUsers, ...firestoreStudents];
    
    // 2. 创建 UID 查找映射
    const authUserMap = new Map(authUsers.map(user => [user.uid, user]));
    const firestoreUserMap = new Map(allFirestoreUsers.map(user => [user.uid, user]));
    
    // 3. 查找孤立的 Authentication 用户（在 Auth 中存在但在 Firestore 中不存在）
    const orphanedAuthUsers = authUsers.filter(user => !firestoreUserMap.has(user.uid));
    logInfo(`找到 ${orphanedAuthUsers.length} 个孤立的 Authentication 用户`);
    
    // 4. 查找孤立的 Firestore 用户（在 Firestore 中存在但在 Auth 中不存在）
    const orphanedFirestoreUsers = allFirestoreUsers.filter(user => !authUserMap.has(user.uid));
    logInfo(`找到 ${orphanedFirestoreUsers.length} 个孤立的 Firestore 用户`);
    
    // 5. 处理孤立的 Authentication 用户
    if (orphanedAuthUsers.length > 0) {
      logInfo('开始处理孤立的 Authentication 用户...');
      console.log('孤立的 Authentication 用户列表：');
      orphanedAuthUsers.forEach(user => {
        console.log(`- ${user.uid} (${user.email || 'No email'})`);
      });
      
      const deleteAuthOrphans = process.env.DELETE_AUTH_ORPHANS === 'true';
      if (deleteAuthOrphans) {
        logInfo('将删除所有孤立的 Authentication 用户');
        for (const user of orphanedAuthUsers) {
          await deleteAuthUser(user.uid);
        }
      } else {
        logInfo('跳过删除孤立的 Authentication 用户。设置 DELETE_AUTH_ORPHANS=true 环境变量以启用删除。');
      }
    }
    
    // 6. 处理孤立的 Firestore 用户
    if (orphanedFirestoreUsers.length > 0) {
      logInfo('开始处理孤立的 Firestore 用户...');
      console.log('孤立的 Firestore 用户列表：');
      orphanedFirestoreUsers.forEach(user => {
        console.log(`- ${user.uid} (${user.email || 'No email'}) [${user.collection}]`);
      });
      
      const deleteFirestoreOrphans = process.env.DELETE_FIRESTORE_ORPHANS === 'true';
      if (deleteFirestoreOrphans) {
        logInfo('将删除所有孤立的 Firestore 用户');
        for (const user of orphanedFirestoreUsers) {
          await deleteFirestoreUser(user.uid, user.collection);
        }
      } else {
        logInfo('跳过删除孤立的 Firestore 用户。设置 DELETE_FIRESTORE_ORPHANS=true 环境变量以启用删除。');
      }
    }
    
    logInfo('数据同步完成！');
    
    return {
      authTotal: authUsers.length,
      firestoreTotal: allFirestoreUsers.length,
      orphanedAuth: orphanedAuthUsers.length,
      orphanedFirestore: orphanedFirestoreUsers.length
    };
  } catch (error) {
    logError(`数据同步过程中发生错误: ${error.message}`);
    throw error;
  }
}

// 开始执行同步
syncUsersData()
  .then(results => {
    console.log('\n同步摘要:');
    console.log('------------------------------');
    console.log(`Authentication 用户总数: ${results.authTotal}`);
    console.log(`Firestore 用户总数: ${results.firestoreTotal}`);
    console.log(`孤立的 Authentication 用户: ${results.orphanedAuth}`);
    console.log(`孤立的 Firestore 用户: ${results.orphanedFirestore}`);
    console.log('------------------------------');
    process.exit(0);
  })
  .catch(error => {
    console.error('同步过程失败:', error);
    process.exit(1);
  }); 