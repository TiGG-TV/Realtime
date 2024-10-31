import { getStorage, ref, getDownloadURL } from 'firebase/storage';

export const getAvatarUrl = async (userId: string): Promise<string> => {
  try {
    const storage = getStorage();
    const storageRef = ref(storage, `avatars/${userId}`);
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.log('Avatar not found, using default:', error.code);
    // Return default avatar SVG URL based on first letter of userId
    return `/api/avatar/${userId[0]?.toUpperCase() || 'U'}`;
  }
};
