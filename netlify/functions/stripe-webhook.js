import Stripe from 'stripe';
import { getUser, updateUser, getUserByCustomerId } from './lib/storage.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_email || session.metadata.email;

        if (email) {
          await updateUser(email, {
            subscription: {
              status: 'active',
              customerId: session.customer,
              subscriptionId: session.subscription,
              createdAt: new Date().toISOString()
            }
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const user = await getUserByCustomerId(subscription.customer);

        if (user) {
          // Map Stripe subscription status to our status
          const statusMap = {
            'active': 'active',
            'past_due': 'past_due',
            'canceled': 'canceled',
            'unpaid': 'unpaid',
            'trialing': 'active',
            'incomplete': 'incomplete',
            'incomplete_expired': 'expired',
            'paused': 'paused'
          };

          await updateUser(user.email, {
            subscription: {
              ...user.subscription,
              status: statusMap[subscription.status] || subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              updatedAt: new Date().toISOString()
            }
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const user = await getUserByCustomerId(subscription.customer);

        if (user) {
          await updateUser(user.email, {
            subscription: {
              ...user.subscription,
              status: 'canceled',
              canceledAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const user = await getUserByCustomerId(invoice.customer);

        if (user) {
          await updateUser(user.email, {
            subscription: {
              ...user.subscription,
              status: 'past_due',
              lastPaymentError: invoice.last_finalization_error?.message || 'Payment failed',
              updatedAt: new Date().toISOString()
            }
          });
        }
        break;
      }

      default:
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  path: '/api/stripe/webhook'
};
