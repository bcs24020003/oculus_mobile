const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
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

// 管理员账号
const adminEmail = "admin@uts-oculus.com";
const adminPassword = "Admin@123456";

// 要升级的学生邮箱
const studentEmail = "bcs24020002@student.uts.edu.my";

async function promoteToAdmin() {
  try {
    // 1. 先使用管理员账号登录
    console.log(`正在使用管理员账号登录: ${adminEmail}`);
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('管理员登录成功');
    
    // 2. 查找学生在 students 集合中的文档
    console.log(`正在查找学生账号: ${studentEmail}`);
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where("email", "==", studentEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // 尝试通过 studentId 查找
      console.log('通过邮箱未找到，尝试通过学号查找...');
      const q2 = query(studentsRef, where("studentId", "==", "BCS24020002"));
      const querySnapshot2 = await getDocs(q2);
      
      if (querySnapshot2.empty) {
        console.log('未找到该学生账号。');
        return;
      } else {
        var studentDoc = querySnapshot2.docs[0];
      }
    } else {
      var studentDoc = querySnapshot.docs[0];
    }
    
    // 3. 获取用户 ID 和信息
    const studentId = studentDoc.id;
    const studentData = studentDoc.data();
    
    console.log(`找到学生账号，用户ID: ${studentId}`);
    console.log('学生数据:', studentData);
    
    // 4. 创建或更新管理员文档
    console.log('正在创建管理员记录...');
    await setDoc(doc(db, 'users', studentId), {
      email: studentData.email || studentEmail,
      fullName: studentData.fullName || 'Admin User',
      role: 'admin',
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    
    console.log('成功将用户升级为管理员！');
    console.log('------------------------------');
    console.log('用户信息:');
    console.log(`邮箱: ${studentData.email || studentEmail}`);
    console.log(`用户ID: ${studentId}`);
    console.log('------------------------------');
    console.log('该用户现在可以访问管理员面板。');
    
    // 5. 登出管理员账号
    await signOut(auth);
    console.log('已登出管理员账号');
    
  } catch (error) {
    console.error('升级账号时出错:', error);
  }
}

// 执行升级操作
promoteToAdmin()
  .then(() => {
    console.log('操作完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  }); 