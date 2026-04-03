import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDWco1KFrD-5YHFJS2ZHwYI-NwxqeWk_W0',
  authDomain: 'bridgeport-public-utility.firebaseapp.com',
  projectId: 'bridgeport-public-utility',
  storageBucket: 'bridgeport-public-utility.firebasestorage.app',
  messagingSenderId: '254871340718',
  appId: '1:254871340718:web:1cf16a92ce5ecf20f38f3f',
  measurementId: 'G-T5SJKR43LT',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
