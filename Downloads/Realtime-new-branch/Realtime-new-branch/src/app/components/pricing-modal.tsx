'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/app/components/ui/use-toast";
import { auth } from "../../types/firebase";
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PricingTier {
  name: string;
  price: number;
  tokens: number;
  effectiveRate: string;
  savings?: string;
  features: string[];
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Basic',
    price: 19,
    tokens: 10000,
    effectiveRate: '~$0.0019/token',
    features: []
  },
  {
    name: 'Starter',
    price: 49,
    tokens: 30000,
    effectiveRate: '~$0.0016/token',
    savings: '15% savings vs Basic plan',
    features: []
  },
  {
    name: 'Pro',
    price: 99,
    tokens: 70000,
    effectiveRate: '~$0.0014/token',
    savings: '26% savings vs Basic plan',
    features: []
  },
  {
    name: 'Business',
    price: 199,
    tokens: 160000,
    effectiveRate: '~$0.0012/token',
    savings: '35% savings vs Basic plan',
    features: []
  }
];

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier>(pricingTiers[0]);
  const { toast } = useToast();
  const user = auth.currentUser;

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to upgrade your account.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          tier: selectedTier.name.toLowerCase(),
          price: selectedTier.price
        }),
      });

      const { sessionId } = await response.json();
      
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Choose Your Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingTiers.map((tier) => (
              <div 
                key={tier.name}
                className={`rounded-lg border p-6 space-y-4 cursor-pointer transition-all
                  ${selectedTier.name === tier.name ? 'border-black ring-2 ring-black' : 'hover:border-gray-400'}`}
                onClick={() => setSelectedTier(tier)}
              >
                <div className="space-y-2">
                  <h3 className="font-bold text-xl">{tier.name}</h3>
                  <div className="text-3xl font-bold">${tier.price}/mo</div>
                  <div className="text-sm text-gray-500">{tier.tokens} tokens</div>
                  <div className="text-sm text-gray-500">{tier.effectiveRate}</div>
                  {tier.savings && (
                    <div className="text-sm text-green-600">{tier.savings}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <Button 
              className="w-full bg-black hover:bg-gray-800 text-white rounded-full h-12"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Upgrade to ${selectedTier.name} for $${selectedTier.price}/mo`
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Free trial includes 2,500 tokens (approximately 2 conversations). No credit card required.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
