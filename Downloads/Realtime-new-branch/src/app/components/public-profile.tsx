'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../types/firebase";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useToast } from "@/app/components/ui/use-toast";
import { generateRandomName } from '../../types/nameGenerator';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

export function PublicProfile() {
  const [user] = useAuthState(auth);
  const [username, setUsername] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState(user?.photoURL || '');
  const { toast } = useToast();
  const firestore = getFirestore();

  useEffect(() => {
    const initializeUser = async () => {
      if (!user) return;

      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUsername(userData.username || '');
        setBio(userData.bio || '');
        setProfilePicture(userData.profilePicture || user.photoURL || ''); // Ensure this line retrieves the profile picture URL
      }
    };

    initializeUser();
  }, [user]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          
          // Upload to Firebase Storage
          const storage = getStorage();
          const storageRef = ref(storage, `avatars/${user.uid}`);
          
          // Upload the base64 string
          await uploadString(storageRef, base64String, 'data_url');
          
          // Get the download URL
          const downloadURL = await getDownloadURL(storageRef);
          
          // Update state with the storage URL
          setProfilePicture(downloadURL);
          
          console.log('Profile picture uploaded successfully');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error uploading profile picture:', error);
        toast({
          title: "Error",
          description: "Failed to upload profile picture. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const userRef = doc(firestore, 'users', user.uid);
      
      // Update user document with merge to preserve other fields
      await setDoc(userRef, {
        userId: user.uid,
        username: username || user.displayName || user.email?.split('@')[0],
        email: user.email,
        bio: bio || '',
        profilePicture: profilePicture || '', // Ensure this line saves the profile picture URL
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Update auth profile
      await updateProfile(user, {
        displayName: username,
        photoURL: profilePicture // Add this line to update auth profile photo
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={profilePicture} alt={username} />
            <AvatarFallback>{username[0]}</AvatarFallback>
          </Avatar>
          <Input type="file" onChange={handleProfilePictureChange} accept="image/*" className="w-auto" />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <Input id="username" value={username} onChange={handleUsernameChange} />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <Textarea id="bio" value={bio} onChange={handleBioChange} rows={3} />
        </div>
      </div>
      <div className="mt-auto">
        <Button onClick={handleSave} className="w-full">Save Changes</Button>
      </div>
    </div>
  );
}
