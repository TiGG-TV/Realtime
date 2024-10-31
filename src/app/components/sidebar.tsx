'use client';

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/button"
import { ScrollArea } from "@/app/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Plus, ChevronDown, User, Settings, LogOut, BarChart2, X, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"
import { auth } from "../../types/firebase"
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { Profile } from "../../types/types"
import { SettingsDialog } from "./settings-dialog"
import Image from 'next/image';
import { PublicProfile } from "./public-profile";
import { ProfileSidebar } from "./ProfileSidebar";
import { PricingModal } from "./pricing-modal";
import { useSubscription } from "../../hooks/useSubscription"; // You'll need to create this hook
import { getAvatarUrl } from '../../utils/avatar';
import { updateProfile } from 'firebase/auth';
import { Alert } from "@/app/components/ui/alert"
import { toast } from "@/app/components/ui/use-toast"
import ProfileNewModal from "./ProfileNewModal"; // Import the new modal

// Define the type for the onProfileSelect prop
interface SidebarProps {
  onProfileSelect?: (profile: Profile) => void;
}

// Modify the function to handle undefined props by providing a default empty object
export default function Sidebar(props: SidebarProps = {}) {
  const { onProfileSelect = () => {} } = props; // Destructure with default

  const [isOpen, setIsOpen] = useState(false)
  const [user] = useAuthState(auth)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const router = useRouter()
  const firestore = getFirestore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPublicProfileOpen, setIsPublicProfileOpen] = useState(false);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const { isSubscribed, isLoading } = useSubscription(); // Add isLoading
  const [username, setUsername] = useState<string>('');
  const [isProfileNewModalOpen, setIsProfileNewModalOpen] = useState(false); // State for modal

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user) return;

      try {
        console.log("Fetching profiles for user:", user.uid);
        const profilesCollection = collection(firestore, 'profiles');
        const q = query(profilesCollection, where("userId", "==", user.uid));
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log("No profiles found for user");
          return;
        }

        const fetchedProfiles: Profile[] = [];
        querySnapshot.forEach((doc) => {
          const profile = { id: doc.id, ...doc.data() } as Profile;
          console.log("Fetched profile:", profile);
          fetchedProfiles.push(profile);
        });

        console.log("All fetched profiles:", fetchedProfiles);
        setProfiles(fetchedProfiles);
      } catch (error) {
        console.error("Error fetching profiles:", error);
        toast({
          variant: "destructive",
          title: "Error fetching profiles",
          description: "Please try refreshing the page"
        });
      }
    };

    fetchProfiles();
  }, [user, firestore]);

  useEffect(() => {
    if (profileId) {
      setIsProfileSidebarOpen(true);
    } else {
      setIsProfileSidebarOpen(false);
    }
  }, [profileId]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUsername(userData.username || user.displayName || user.email?.split('@')[0] || 'User');
          
          // Fetch avatar URL from storage
          const avatarUrl = await getAvatarUrl(user.uid);
          if (avatarUrl) {
            // Update auth profile if needed
            if (user.photoURL !== avatarUrl) {
              await updateProfile(user, { photoURL: avatarUrl });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user, firestore]);

  const deleteProfile = async (profileId: string) => {
    if (user && profileId) {
      try {
        console.log(`Attempting to delete profile with ID: ${profileId}`);
        
        // Get reference to the profiles collection and the specific profile document
        const profilesRef = collection(firestore, 'profiles');
        const profileQuery = query(profilesRef, 
          where("id", "==", profileId),
          where("userId", "==", user.uid)
        );

        // Get the profile document
        const querySnapshot = await getDocs(profileQuery);
        
        if (querySnapshot.empty) {
          console.error("Profile not found or unauthorized");
          return;
        }

        // Get the Firestore document ID (which might be different from the profile.id)
        const firestoreDocId = querySnapshot.docs[0].id;
        const profileRef = doc(firestore, 'profiles', firestoreDocId);

        // Delete the profile
        await deleteDoc(profileRef);
        console.log(`Profile ${profileId} deleted successfully from Firestore`);
        
        // Update local state immediately after successful deletion
        setProfiles(prevProfiles => {
          const updatedProfiles = prevProfiles.filter(profile => profile.id !== profileId);
          console.log("Updated profiles after deletion:", updatedProfiles);
          return updatedProfiles;
        });

        // Navigate to home if the deleted profile was currently selected
        const currentProfileId = new URLSearchParams(window.location.search).get('profileId');
        if (currentProfileId === profileId) {
          router.push('/?reset=true');
        }

      } catch (error) {
        console.error("Error deleting profile:", error);
        alert('Failed to delete profile. Please try again.');
      }
    } else {
      console.error("User not logged in or profile ID is missing");
    }
  }

  const handleLogoClick = () => {
    console.log('Navigating to home page');
    // Force a complete reset by using the router
    router.push('/?reset=true');
  };

  const handleProfileClick = (profileId: string) => {
    console.log(`Looking for profile with ID: ${profileId}`);
    const selectedProfile = profiles.find(profile => profile.id === profileId);
    if (selectedProfile) {
      console.log('Profile selected:', selectedProfile.name);
      onProfileSelect(selectedProfile);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 h-screen bg-white text-gray-800 p-4 flex flex-col border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo and Toggle button container */}
      <div className="flex items-center justify-between mb-4">
        {/* Logo */}
        <div className="cursor-pointer" onClick={handleLogoClick}>
          {isCollapsed ? (
            <h1 className="text-xl font-semibold">CC</h1>
          ) : (
            <h1 className="text-xl font-semibold">chatchamp.ai</h1>
          )}
        </div>

        {/* Toggle button */}
        <button
          className="p-1 rounded-full hover:bg-gray-200"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 mb-6">
        <Button 
          className={`w-full justify-center bg-gray-100 text-black hover:bg-gray-200 rounded-full ${isCollapsed ? 'p-2' : ''}`}
          variant="ghost"
          onClick={() => setIsProfileNewModalOpen(true)}
        >
          <Plus className={`${isCollapsed ? '' : 'mr-2'} h-4 w-4`} />
          {!isCollapsed && "Create"}
        </Button>
        <Button 
          className={`w-full justify-center text-gray-600 hover:bg-gray-100 rounded-full ${isCollapsed ? 'p-2' : ''}`}
          variant="ghost"
          onClick={() => router.push('/progressPage')}
        >
          <BarChart2 className={`${isCollapsed ? '' : 'mr-2'} h-4 w-4`} />
          {!isCollapsed && "Progress"}
        </Button>
      </div>

      {/* My Profiles */}
      <div className="flex-grow overflow-hidden">
        {!isCollapsed && <h2 className="text-sm font-semibold mb-2">My Profiles</h2>}
        <div className={`overflow-y-auto ${isCollapsed ? 'h-[calc(100vh-200px)]' : 'h-[calc(100vh-350px)]'}`}>
          {profiles.map((profile) => (
            <div key={profile.id} className="relative group">
              <Button 
                variant="ghost" 
                className={`w-full justify-center py-2 hover:bg-gray-100 rounded-full ${isCollapsed ? 'px-0' : 'justify-start px-2'}`}
                onClick={() => handleProfileClick(profile.id)} // Use handleProfileClick
              >
                <Avatar className={`${isCollapsed ? 'w-8 h-8' : 'w-8 h-8 mr-2'}`}>
                  {profile.imageUrl ? (
                    <AvatarImage 
                      src={profile.imageUrl} 
                      alt={profile.name}
                      className="object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', profile.imageUrl);
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <AvatarFallback className="bg-gray-200">
                      {profile.name ? profile.name[0].toUpperCase() : '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
                {!isCollapsed && <span className="text-sm truncate">{profile.name}</span>}
              </Button>
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (profile.id) {
                      if (confirm('Are you sure you want to delete this profile?')) {
                        console.log(`Attempting to delete profile with ID: ${profile.id}`);
                        deleteProfile(profile.id);
                      }
                    } else {
                      console.error("Profile ID is missing");
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto">
        {!isCollapsed ? (
          <div className="text-xs text-gray-500">
            <div className="flex justify-center mb-2 space-x-1">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </div>
          </div>
        ) : null}
        
        {/* Show upgrade button in both collapsed and expanded states */}
        {!isLoading && !isSubscribed && (
          <Button 
            className={`w-full justify-center ${isCollapsed ? 'p-2' : ''} bg-green-100 text-green-800 hover:bg-green-200 rounded-full`}
            variant="default"
            onClick={() => setIsPricingOpen(true)}
          >
            {isCollapsed ? <Plus className="h-4 w-4" /> : "Upgrade"}
          </Button>
        )}
      </div>

      {/* User Profile Dropdown */}
      <div className={`mt-4 pt-4 border-t border-gray-200`}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full justify-center hover:bg-transparent rounded-full ${isCollapsed ? 'p-2' : 'justify-between px-2'}`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={user?.photoURL || ''} 
                    alt={username}
                    className="object-cover"
                    onError={(e) => {
                      console.error('Profile image failed to load:', user?.photoURL);
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.svg';
                    }}
                  />
                  <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="ml-2">
                    <p className="text-sm font-medium truncate">{username}</p>
                  </div>
                )}
              </div>
              {!isCollapsed && <MoreHorizontal className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => auth.signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      {profileId && (
        <ProfileSidebar
          profile={profiles.find(p => p.id === profileId) || null}
          score={null}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onOpen={() => setIsOpen(true)}
        />
      )}
      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
      />

      {/* Profile New Modal */}
      <ProfileNewModal 
        isOpen={isProfileNewModalOpen} 
        onClose={() => setIsProfileNewModalOpen(false)} 
      />
    </div>
  );
}
