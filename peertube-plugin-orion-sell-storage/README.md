# PeerTube plugin Sell Storage

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)

## About <a name = "about"></a>

This plugin allow you to sell storage space to your users using Stripe subscription.
Payments are automated with Stripe.

## Getting Started <a name = "getting_started"></a>

Check [Prerequisites](#Prerequisites) to install this plugin

### Prerequisites

- Peertube >= v4.3.0

### Installing

- Go to your instance Admin
- Navigate to the "Plugins" page
- Search for "orion-sell-storage"
- Click Install near the plugin name

### Configuration
You need to configuration the plugin to work.
Create an account on https://stripe.com to start.


In your Stripe dashboard, you can test in "Test mode", and go live by unchecking "Test mode" in the top right.
To go in live mode, you need to fill form in Stripe side. We recommand you to test in Test mode the integration before go in live.

First, go to the Developer tab, and navigate to "API Keys". Grab your Secret API key, and insert it in your plugin settings.
After that, always in the Developer tab, navigate to Webhook and create a webhook.

An example of webhook URL is available in your plugin settings.
Its like https://your-instance.tld/plugins/orion-sell-storage/1.0.0/router/webhook

Keep in mind, you need to update the webhook URL on stripe-side for each new plugin version, because the version is in the URL.
Now, configure your Currency and Page description in the plugin settings.

Its time to add your Plans! In stripe, go to Product page, and add new product. Set a name, description and the price.
After creation, go in this new Product and grab the "API ID" near the price field.

Now, you can continue configure your Plan (1, 2, 3) in the plugin settings.
Repeat this process for each plans. Add new product, and grave the API ID corresponding to this price to insert it in your Product ID field, in the plugin settings.

## Usage <a name = "usage"></a>

- Navigate to "My Account""
- Navigate to the new navigation link "My Subscription"
