import { initializeApp } from '../frontend/apps/web/node_modules/firebase/app/dist/esm/index.js';
import { getAuth, signInWithEmailAndPassword } from '../frontend/apps/web/node_modules/firebase/auth/dist/esm/index.js';

const firebaseConfig = {
  apiKey: "AIzaSyDqrihvZvMvC3pwClKIeIisqVKcfBPqKa4",
  authDomain: "lead-hunter-club.firebaseapp.com",
  projectId: "lead-hunter-club",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testLogin() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'admin@leadhunter.com', 'LeadHunter@Admin2026#Secure');
    const token = await cred.user.getIdToken();
    console.log('Successfully authenticated as admin! Token length:', token.length);
    return token;
  } catch (err) {
    console.error('Login failed:', err.message);
    return null;
  }
}

testLogin();
