# PeerTube plugin Minetization

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Configuration](#configuration)

## About <a name = "about"></a>

This plugin add 3 features to monetize your Instance
- Banner ads on video list (who monetize the instance admin)
- Video Ads when viewing video. (Only one of two, and if enabled by the admin AND enabled by the video owner. Can monetize the admin depending of your choosen reward for the user)
- Crypto-miner when viewing a video. (Only if enabled by the admin AND enabled by the video owner. Can monetize the admin depending of your choosen reward for the user)

Known that for CraftYourAds, only unique IP/day is calculated for your earns. That mean one IP generate earns only for one view and click per day.
You can see your stats on your CraftYourAds Manager.

## Getting Started <a name = "getting_started"></a>

Check [Prerequisites](#Prerequisites) to install this plugin

### Prerequisites

- Peertube >= v4.2.0
- Banner or Video Ads : Make an account on https://craftyourads.com
- Crypto-miner : Make an account on https://coinimp.com

### Installing

- Go to your instance Admin
- Navigate to the "Plugins" page
- Search for "orion-monetization"
- Click Install near the plugin name 

``
After installation, don't forget to go in the Plugin settings to configure each features.
``
### Configuration <a name = "configuration"></a>
- Navigate to the plugin settings, from your instance admin

#### Video Ads Settings
- Check the Enabled checkbox to allow this feature on your instance
- Go on https://manager.craftyourads.com
- Login, and navigate to Publisher.
- Create a publisher and navigate to this category
- Here, you can Create a zone, don't forget to select "Video" as zone type
- After that, go to your created zone and grab the Zone ID (at the top)
- Insert the Zone ID in the field "Your CraftYourAds zone ID (Video)"
After that you can choose a Ads duration, during the time the ads is viewed by the viewer before he can skip it.
Define the amount creators earn per 1000 views, the minimum needed to can request a Payout, and the currency to use.

#### Banner Ads Settings
- Check the Enabled checkbox to allow this feature on your instance
- Go on https://manager.craftyourads.com
- Login, and navigate to Publisher.
- Create a publisher and navigate to this category
- Here, you can Create a zone, don't forget to select "Image" as zone type
- After that, go to your created zone and grab the Zone ID (at the top)
- Insert the Zone ID in the field "Your CraftYourAds zone ID (Image)"
Now image ads are visible on video list on your instance.

#### Crypto-miner Settings
- Check the Enabled checkbox to allow this feature on your instance
- Go on https://coinimp.com and create an account
- Login, and navigate to Dashboard.
- Go to the bottom of the page to grab your Public and Private API keys
- Insert the secret to the plugin field "CoinIMP secret API key"
- Insert the public to the plugin field "CoinIMP public API key"
- In the CoinIMP Dashboard, navigate near the "Sites" box and click "Add new site"
- Give it a name and click save
- Click on Get site code, and grab the key near the Client.Anonymous text
````
Client.Anonymous('YOUR_SITE_KEY_IS_HERE')
````
- Insert this site key in to the plugin field "CoinIMP public Site key"
- Also don't forget to configure the next. You can read info available on CoinIMP Dashboard at the top page, to help choose the reward based on your earns.
- I suggest to use '0.90' for the setting "Miner CPU throttle (Desktop)" and '0.95' for "Miner CPU throttle (Mobile)" to not overload user CPU

### Usage <a name = "usage"></a>
- As a creator, when uploading a video you can simply enable/disable the checkbox "Enable Video Ads", or "Enable Crypto-miner Monetization" to start monetizing.
- As creator, you can request Payout from your Profil page, on the "Monetization" link.
- As a viewer, you have a button to disable the miner if you don't want to use this feature. A notification is always displayed when the miner start.
