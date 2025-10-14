// Simple GitHub OAuth - No dependencies needed!
import { cookies } from 'next/headers';

export interface User {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

// Get current user from session
export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('github_user');
  
  if (!userCookie) return null;
  
  try {
    return JSON.parse(userCookie.value);
  } catch {
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser();
  return !!user;
}

// Sign out
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete('github_user');
  cookieStore.delete('github_token');
}

