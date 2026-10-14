import { getAdminAuthInstance } from '../lib/firebase-admin';

async function main() {
  const auth = await getAdminAuthInstance();
  const user = await auth.getUser('ObhdK3fIIIdbnbGdPw0POL8d68g1');
  console.log('Firebase user info:', {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    customClaims: user.customClaims,
    metadata: user.metadata,
  });
}

main().catch(console.error);
