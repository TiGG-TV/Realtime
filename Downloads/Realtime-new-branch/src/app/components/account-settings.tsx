'use client';

import { Button } from "@/app/components/ui/button";
import { PricingModal } from "./pricing-modal";
import { useState } from "react";
import { useSubscription } from "../../hooks/useSubscription";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { useToast } from "@/app/components/ui/use-toast";
import { auth } from "../../types/firebase";

export function AccountSettings() {
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const { isSubscribed, isLoading, cancelSubscription } = useSubscription();
  const { toast } = useToast();

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      setIsCancelModalOpen(false);
      toast({
        title: "Subscription cancelled",
        description: "Your subscription will end at the end of the current billing period.",
        duration: 5000,
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="font-medium">Your current plan</p>
            <p className="text-gray-500">{isSubscribed ? 'Premium' : 'Free'}</p>
          </div>
          {isSubscribed ? (
            <Button 
              className="bg-red-100 text-red-800 hover:bg-red-200 rounded-full" 
              variant="default"
              onClick={() => setIsCancelModalOpen(true)}
            >
              Cancel Membership
            </Button>
          ) : (
            <Button 
              className="bg-green-100 text-green-800 hover:bg-green-200 rounded-full" 
              variant="default"
              onClick={() => setIsPricingOpen(true)}
            >
              Upgrade
            </Button>
          )}
        </div>

        {/* Additional account settings */}
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Danger Zone</h3>
            <div className="space-y-2">
              {isSubscribed && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Cancel Premium Membership
                </Button>
              )}
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                Logout
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      <PricingModal 
        isOpen={isPricingOpen} 
        onClose={() => setIsPricingOpen(false)} 
      />

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Premium Membership?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your premium membership? You'll lose access to premium features at the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Keep Membership
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
            >
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
