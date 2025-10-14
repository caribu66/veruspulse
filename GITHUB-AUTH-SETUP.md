# GitHub Authentication - Simple Setup 🚀

No complicated packages! Just works with Next.js built-in features.

## Step 1: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: Verus Explorer
   - **Homepage URL**: `http://localhost:3004`
   - **Callback URL**: `http://localhost:3004/api/auth/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy it

## Step 2: Add to Environment Variables

Add these to your `.env.local` file (create it if it doesn't exist):

```env
# GitHub OAuth
GITHUB_ID=your_client_id_here
GITHUB_SECRET=your_client_secret_here
NEXTAUTH_URL=http://localhost:3004
```

## Step 3: Add the Button to Your App

Add this anywhere in your app (like in a header or navbar):

```tsx
import { GitHubAuthButton } from '@/components/github-auth-button';

export default function YourComponent() {
  return (
    <div>
      <GitHubAuthButton />
    </div>
  );
}
```

## Step 4: Restart Your Dev Server

```bash
npm run dev
```

## That's It! 🎉

Click the "Sign in with GitHub" button and you're done!

## Check If User Is Logged In (Optional)

In any server component:

```tsx
import { getUser } from '@/lib/simple-auth';

export default async function ProtectedPage() {
  const user = await getUser();
  
  if (!user) {
    return <div>Please sign in</div>;
  }
  
  return <div>Welcome {user.name}!</div>;
}
```

## API Routes

- **Sign In**: `/api/auth/github`
- **Sign Out**: `/api/auth/signout`
- **Get User**: `/api/auth/me`
- **Callback**: `/api/auth/callback` (GitHub redirects here)

