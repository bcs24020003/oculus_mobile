/**
 * 这个脚本用于手动将学生账号升级为管理员账号
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyC9tSMyMJPmFypoTH9JTaY8GO6UF5FTx50",
  authDomain: "uts-oculus.firebaseapp.com",
  projectId: "uts-oculus",
  storageBucket: "uts-oculus.appspot.com",
  messagingSenderId: "905728409505",
  appId: "1:905728409505:web:5f94457d684c156ebf95e0",
  measurementId: "G-MXHZL67Z9C"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 学生信息
const studentUID = "CYtVgJZutXWtBdgjfaScT5xMhXp2"; // 从查找脚本中获得的UID
const studentEmail = "bcs24020002@student.uts.edu.my";
const studentName = "kong chun shen";

async function promoteToAdmin() {
  try {
    console.log(`正在将学生 ${studentName} (${studentEmail}) 升级为管理员...`);
    
    // 在 users 集合中创建管理员记录
    await setDoc(doc(db, 'users', studentUID), {
      email: studentEmail,
      fullName: studentName,
      role: 'admin',
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    
    console.log('成功升级为管理员!');
    
  } catch (error) {
    console.error('升级过程中出错:', error);
  }
}

// 执行升级
promoteToAdmin()
  .then(() => {
    console.log('操作完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  });

/**
 * 步骤:
 * 1. 登录 Firebase 控制台: https://console.firebase.google.com
 * 2. 选择 uts-oculus 项目
 * 3. 左侧导航栏选择 "Firestore Database"
 * 4. 找到 "students" 集合，查看需要升级的学生信息，并记录其 UID 和邮箱
 * 5. 创建新的 users 文档:
 *    - 集合: users
 *    - 文档ID: [与学生文档相同的UID]
 *    - 字段:
 *        email: [学生的邮箱]
 *        fullName: [学生的全名]
 *        role: "admin"
 *        createdAt: [serverTimestamp]
 *        lastUpdated: [serverTimestamp]
 * 
 * 完成后，该学生账号将获得管理员权限。
 */ 