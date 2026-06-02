import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyB0QWAqC5xl9VFqiSx2dLTdDLcfTA7Sg5Y",
  authDomain: "capstonego-84e38.firebaseapp.com",
  projectId: "capstonego-84e38",
  storageBucket: "capstonego-84e38.firebasestorage.app",
  messagingSenderId: "523106429049",
  appId: "1:523106429049:web:10fdf991aeaf0391fe0ca8"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
} catch (e) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
