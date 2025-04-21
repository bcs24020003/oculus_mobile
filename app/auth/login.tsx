import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to create a test user for demo purposes
  const createTestUser = async () => {
    try {
      const auth = getAuth();
      const testEmail = "student@example.com";
      const testPassword = "password123";
      const testStudentId = "BCS24020003";

      // Try to create a new user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        const user = userCredential.user;
        
        await updateProfile(user, {
          displayName: "Steven Ling Chung Lian"
        });
        
        // Create user document in Firestore
        const db = getFirestore();
        await setDoc(doc(db, 'students', user.uid), {
          fullName: "Steven Ling Chung Lian",
          studentId: testStudentId,
          email: testEmail,
          department: 'Faculty of Engineering and IT',
          program: 'Bachelor of Science in IT',
          photoUrl: '',
          createdAt: new Date().toISOString(),
          dateOfBirth: '1995-05-15',
          mailingAddress: '123 University Street, Sydney NSW 2000',
          nric: 'S1234567A'
        });
        
        console.log("Test user created successfully!");
        return true;
      } catch (error: any) {
        // If the user already exists, just proceed with login
        if (error.code === 'auth/email-already-in-use') {
          return true;
        }
        console.error("Error creating test user:", error);
        return false;
      }
    } catch (error) {
      console.error("Error in createTestUser:", error);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('错误', '请填写所有字段');
      return;
    }

    setLoading(true);
    try {
      console.log('正在尝试登录...', { usernameOrId: username });
      
      // 用于演示的测试用户
      if (username === 'BCS24020003' || username === 'student@example.com') {
        await createTestUser();
        // 创建/确保测试用户存在后，使用这些凭据登录
        const auth = getAuth();
        console.log('使用测试用户凭据登录:', { email: 'student@example.com' });
        await signInWithEmailAndPassword(auth, 'student@example.com', 'password123');
        
        console.log('测试用户登录成功，正在导航...');
        router.replace('/(tabs)/home');
        return;
      }
      
      // 处理正常登录流程
      // 检查输入是否为学生ID
      const isStudentId = /^BCS\d+$/.test(username);
      let email = username;
      
      console.log('登录方式:', isStudentId ? '学生ID' : '邮箱');

      // 如果输入的是学生ID，在Firestore中查找对应的邮箱
      if (isStudentId) {
        const db = getFirestore();
        const studentsCollection = collection(db, 'students');
        const q = query(studentsCollection, where('studentId', '==', username));
        
        console.log('正在查找学生ID对应的邮箱...');
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error('未找到该学生ID，请检查后重试。');
        }

        // 从第一个匹配的文档中获取邮箱
        email = querySnapshot.docs[0].data().email;
        console.log('找到学生邮箱:', { email });
        
        if (!email) {
          throw new Error('找到学生记录但没有关联的邮箱，请联系管理员。');
        }
      }

      // 使用邮箱和密码登录
      const auth = getAuth();
      console.log('正在尝试登录Firebase:', { email });
      await signInWithEmailAndPassword(auth, email, password);
      
      console.log('登录成功，正在导航...');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('登录错误:', error);
      
      let errorMessage = error.message;
      // 记录详细的错误信息
      console.error('登录失败:', { 
        code: error.code, 
        message: error.message,
        credentials: { username, passwordLength: password?.length || 0 }
      });
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = '无效的邮箱格式，请检查后重试。';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = '未找到该邮箱的账户，请先注册。';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = '密码不正确，请重试。';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = '登录尝试次数过多，请稍后再试或重置密码。';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = '此账户已被禁用，请联系管理员。';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = '网络错误，请检查您的连接并重试。';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = '无效的凭据，请检查您的邮箱和密码。';
      }
      
      Alert.alert('登录失败', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/uts-logo-new.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>UTS Oculus</Text>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.label}>Username or Student ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter email or student ID (e.g., BCS24020003)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.helpText}>
          You can log in with your UTS email or student ID
        </Text>
        
        <Text style={styles.demoText}>
          Demo Login: BCS24020003 / password123
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  button: {
    backgroundColor: '#1E3A8A',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  demoText: {
    color: '#10B981',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  }
}); 