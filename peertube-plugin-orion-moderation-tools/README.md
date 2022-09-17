# PeerTube plugin Moderation Tools

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)

## About <a name = "about"></a>

This plugin add new feature allowing to temporary ban a channel OR an account for desired time
When banning a user channel, all videos of this channel are blacklisted during the defined time.
When banning an account, all user channels and videos are bkacklisted during the defined time. If user create new channel, it will be directly banned too.
Also, the user won't be able to upload new video on this channel during the defined time.

A banned account can't reply to video comments.

## Getting Started <a name = "getting_started"></a>

Check [Prerequisites](#Prerequisites) to install this plugin

### Prerequisites

- Peertube >= v4.2.0

### Installing

- Go to your instance Admin
- Navigate to the "Plugins" page
- Search for "orion-moderation-tools"
- Click Install near the plugin name

## Usage <a name = "usage"></a>

- Navigate to a user channel
- Click on Ban button at the top to show the modal

- Navigate to a user account page
- Click on Ban button at the top right to show the modal
