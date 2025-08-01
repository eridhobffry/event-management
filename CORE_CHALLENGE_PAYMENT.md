The Core Challenge: Platform vs. Single Seller
The key difference is that we are not building a simple shop that sells its own products. We are building a platform where many different event organizers (our users) need to sell tickets to their attendees.
This creates a specific challenge:
Who gets the money? The money from ticket sales needs to go to the specific organizer of that event, not into a single bank account for our platform.
Who handles payouts? If our platform collected all the money, we would become responsible for paying out each organizer, which creates a huge accounting and legal overhead for us.
Who is the legal seller? For legal and tax purposes, the event organizer is the seller, not our platform. The payment system needs to reflect that.
Comparing the Options for a Platform Model
This is where the options differ significantly:
Option How it Works for a Platform Pros Cons
PayPal / SumUp The platform would need a single "Business" account. All ticket money would go into this account. The platform would then have to manually track sales for each organizer and send them their money later. - Superficially Simple: Easy to add a "Pay with PayPal" button for the initial payment. - Major Hidden Complexity: Creates a massive, unscalable bottleneck. You become responsible for payouts, financial reporting for others, and handling disputes. It puts a huge legal and financial liability on the platform owner.
Stripe (with Connect) Stripe Connect is specifically designed for platforms and marketplaces. Each event organizer links their own bank account to Stripe through our platform. When a ticket is sold, the money goes directly to the organizer's Stripe account. The platform can optionally take a small application fee automatically. - Solves the Core Problem: It correctly handles payments for a multi-vendor platform from day one. <br>- Scalable & Automated: No manual payouts. Stripe handles KYC (Know Your Customer) verification, compliance, and reporting for each organizer. <br>- Reduces Liability: You are a technology provider, not a financial middleman. - Perceived Complexity: The initial setup for Connect is more involved than a simple payment button because it's solving a much harder problem. However, their documentation is excellent.
My Recommendation: Start with Stripe Connect
Even for an MVP, I strongly recommend using Stripe Connect.
Your intuition about Stripe being "complicated" is valid for a simple website, but for the platform we're building, trying to use PayPal or SumUp would be far more complicated in the long run. The manual payout model is not sustainable and introduces significant risk.
Stripe Connect is the professional, scalable, and correct tool for this job. It handles the difficult parts of being a platform, allowing us to focus on building the event management features. It is built to handle exactly your use case: allowing individuals and informal groups (sole proprietors) to accept payments without needing a formally registered company.
To make it feel less daunting, we can break it down into small, manageable steps. Here's how we can start:
Set up a Stripe developer account and get API keys.
Use Stripe Checkout for the payment UI. This is a pre-built, secure payment page hosted by Stripe, so we don't have to build it ourselves.
Implement the "Stripe Connect Onboarding" flow. This is a link that sends organizers to Stripe to securely connect their bank account. We can guide them through this process.
This approach aligns with your principle of choosing the easiest sustainable win. While it might take a day or two longer to set up than a PayPal button, it will save us weeks of headaches and risk down the line.
What do you think? If you're on board, I can start by outlining the specific tasks needed to integrate Stripe Connect into our app.
