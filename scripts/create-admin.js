const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signOut 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp 
} = require('firebase/firestore');

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
const auth = getAuth(app);
const db = getFirestore(app);

// 配置管理员账号信息
const adminEmail = "admin@uts-oculus.com";  // 修改为您想要的管理员邮箱
const adminPassword = "Admin@123456";       // 修改为强密码
const adminFullName = "UTS管理员";          // 修改为您想要的管理员名称

async function createAdminAccount() {
  try {
    console.log(`正在创建管理员账号: ${adminEmail}`);
    
    // 创建 Firebase 认证账号
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword
    );
    
    const userId = userCredential.user.uid;
    console.log(`已创建认证账号，用户ID: ${userId}`);
    
    // 在 Firestore users 集合中创建管理员文档
    await setDoc(doc(db, 'users', userId), {
      email: adminEmail,
      fullName: adminFullName,
      role: 'admin',
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    
    console.log('成功创建管理员账号！');
    console.log('------------------------------');
    console.log('管理员登录信息:');
    console.log(`邮箱: ${adminEmail}`);
    console.log(`密码: ${adminPassword}`);
    console.log('------------------------------');
    console.log('请妥善保存这些信息，并在登录后修改密码！');
    
    // 退出登录以便随后能够使用新账号登录
    await signOut(auth);
    
  } catch (error) {
    console.error('创建管理员账号时出错:', error);
    if (error.code === 'auth/email-already-in-use') {
      console.log('该邮箱已被使用，请尝试使用另一个邮箱。');
    }
  }
}

// 执行创建管理员账号的操作
createAdminAccount()
  .then(() => {
    console.log('操作完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  }); 