import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const firestore = getFirestore();

// Add the missing function to get subscription ID from database
async function getSubscriptionIdFromDatabase(userId: string): Promise<string> {
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  const userData = userDoc.data();
  
  if (!userData?.stripeSubscriptionId) {
    throw new Error('No subscription found for user');
  }
  
  return userData.stripeSubscriptionId;
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    // Get the subscription ID from your database
    const subscriptionId = await getSubscriptionIdFromDatabase(userId);

    // Cancel the subscription at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update your database to reflect the cancellation
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      subscriptionStatus: 'canceling'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
