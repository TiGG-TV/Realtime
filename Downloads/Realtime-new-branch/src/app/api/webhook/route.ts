import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Add interface for user document
interface UserDocument {
  username: string;
  bio: string;
  subscriptionStatus: 'active' | 'inactive' | 'canceling';
  credits: number;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionPlan: 'free' | 'premium';
  updatedAt: Date;
}

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-09-30.acacia',
});

const db = getFirestore();

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.metadata?.userId;

        if (!userId) {
          throw new Error('No userId in session metadata');
        }

        // Get existing user data first
        const userDoc = await db.collection('users').doc(userId).get();
        const existingData = userDoc.data() as UserDocument | undefined;

        // Update user's subscription status in Firestore
        await db.collection('users').doc(userId).set({
          ...existingData,
          stripeCustomerId: customerId,
          subscriptionId: subscriptionId,
          subscriptionStatus: 'active',
          credits: (existingData?.credits || 0) + 100, // Add initial credits
          subscriptionPlan: 'premium',
          updatedAt: new Date(),
          // Preserve existing fields
          username: existingData?.username || '',
          bio: existingData?.bio || '',
        }, { merge: true });

        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user with this stripeCustomerId and update their status
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
        
        if (!snapshot.empty) {
          const userId = snapshot.docs[0].id;
          await usersRef.doc(userId).update({
            subscriptionStatus: 'inactive',
            subscriptionPlan: 'free',
            updatedAt: new Date(),
          });
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
