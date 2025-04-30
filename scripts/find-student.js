const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

// 要查找的学生ID
const studentId = "BCS24020002";
const studentEmail = "bcs24020002@student.uts.edu.my";

async function findStudent() {
  console.log('查找学生...');
  
  // 首先通过邮箱查找
  const emailQuery = query(collection(db, 'students'), where("email", "==", studentEmail));
  const emailSnapshot = await getDocs(emailQuery);
  
  if (!emailSnapshot.empty) {
    console.log('通过邮箱找到学生:');
    emailSnapshot.forEach(doc => {
      console.log('文档ID:', doc.id);
      console.log('学生数据:', doc.data());
    });
    return;
  }
  
  // 然后通过学号查找
  const idQuery = query(collection(db, 'students'), where("studentId", "==", studentId));
  const idSnapshot = await getDocs(idQuery);
  
  if (!idSnapshot.empty) {
    console.log('通过学号找到学生:');
    idSnapshot.forEach(doc => {
      console.log('文档ID:', doc.id);
      console.log('学生数据:', doc.data());
    });
    return;
  }
  
  console.log('未找到学生');
}

// 执行查找
findStudent()
  .then(() => {
    console.log('查找完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('查找过程中出错:', error);
    process.exit(1);
  }); 