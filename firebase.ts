// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore"; 
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-GmU5i36m3rXQtwdWNjS7rke1ZBPbXN4",
  authDomain: "ppblogger-01.firebaseapp.com",
  projectId: "ppblogger-01",
  storageBucket: "ppblogger-01.appspot.com",
  messagingSenderId: "980302642344",
  appId: "1:980302642344:web:359d36b4266e813908569d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const db = initializeFirestore(app, {
    localCache: persistentLocalCache({})
});

// Initialize Cloud Storage and get a reference to the service
const storage = getStorage(app);

export { db, storage };
