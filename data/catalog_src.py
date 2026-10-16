# Curated "equator": 100 of the most popular apps <-> their best-rated open-source twins on GitHub.
# Twins are ordered best-first. kind: app (installable Android app), server (self-hosted + web),
# desktop, web, engine (library/tooling you run yourself).
C = lambda *a: a  # tiny helper for readability

CATS = [
  ("social",   "Social"),
  ("chat",     "Messaging"),
  ("watch",    "Video"),
  ("listen",   "Music & Audio"),
  ("create",   "Create"),
  ("ai",       "AI"),
  ("work",     "Productivity"),
  ("files",    "Files & Cloud"),
  ("web",      "Web & News"),
  ("places",   "Maps & Home"),
  ("privacy",  "Privacy"),
  ("system",   "System"),
  ("health",   "Health"),
  ("money",    "Money"),
  ("shop",     "Shopping"),
  ("learn",    "Learn & Read"),
  ("play",     "Games"),
]

# (id, popular app, maker, category, blurb, [twins: (repo, name, tagline, kind, [perks])])
APPS = [
 ("chatgpt","ChatGPT","OpenAI","ai","AI assistant for chat, writing and code",[
   ("open-webui/open-webui","Open WebUI","A polished, self-hosted chat interface for any model, local or cloud.","server",["Any model","Self-hosted","Offline-capable"]),
   ("danny-avila/LibreChat","LibreChat","One chat app for every AI provider, with agents and search.","server",["Multi-provider","Agents","Self-hosted"]),
   ("lobehub/lobehub","LobeHub","Modern AI workspace with plugins, agents and knowledge bases.","server",["Plugins","Agents","PWA"])]),
 ("instagram","Instagram","Meta","social","Photo and short-video sharing",[
   ("pixelfed/pixelfed","Pixelfed","Ad-free photo sharing on the fediverse, with chronological feeds.","server",["No ads","Federated","Chronological"])]),
 ("tiktok","TikTok","ByteDance","social","Short-form vertical video",[
   ("joinloops/loops-server","Loops","Short-form looping video on the fediverse, from the creator of Pixelfed.","server",["Federated","No ads","Open protocol"]),
   ("Chocobozzz/PeerTube","PeerTube","Decentralised video hosting with peer-to-peer streaming.","server",["Federated","P2P streaming","Self-hosted"])]),
 ("whatsapp","WhatsApp","Meta","chat","Messaging and calls",[
   ("signalapp/Signal-Android","Signal","Gold-standard end-to-end encrypted messaging, calls and stories.","app",["E2E encrypted","Non-profit","No ads"]),
   ("session-foundation/session-android","Session","Private messenger with no phone number and onion routing.","app",["No phone number","Onion routed","E2E encrypted"])]),
 ("capcut","CapCut","ByteDance","create","Video editing and templates",[
   ("OpenCut-app/OpenCut","OpenCut","A free, open-source video editor built as a CapCut alternative.","web",["No watermark","Privacy-first","Timeline editing"]),
   ("mltframework/shotcut","Shotcut","Cross-platform video editor with a huge format range.","desktop",["4K","No watermark","Cross-platform"]),
   ("KDE/kdenlive","Kdenlive","KDE's multi-track video editor for serious projects.","desktop",["Multi-track","Effects","Proxy editing"])]),
 ("netflix","Netflix","Netflix","watch","Streaming films and series",[
   ("jellyfin/jellyfin","Jellyfin","Your own streaming service for the media you already own.","server",["Self-hosted","No subscriptions","Live TV"]),
   ("jellyfin/jellyfin-android","Jellyfin for Android","The official Jellyfin client for phones and tablets.","app",["Offline sync","Casting","Free"])]),
 ("facebook","Facebook","Meta","social","Social network and groups",[
   ("diaspora/diaspora","diaspora*","The original privacy-aware, distributed social network.","server",["Federated","You own your data","No ads"]),
   ("friendica/friendica","Friendica","Decentralised social networking that talks to Mastodon and more.","server",["Federated","Groups","Events"])]),
 ("snapchat","Snapchat","Snap","chat","Disappearing photos and messages",[
   ("simplex-chat/simplex-chat","SimpleX Chat","Messaging with no user IDs at all, with disappearing messages.","app",["No user IDs","E2E encrypted","Disappearing"])]),
 ("threads","Threads","Meta","social","Text-first public conversations",[
   ("mastodon/mastodon","Mastodon","The flagship federated social network, ad-free by design.","server",["Federated","No algorithm","No ads"]),
   ("mastodon/mastodon-android","Mastodon for Android","The official Mastodon app for Android.","app",["Native","Free","Accessible"]),
   ("tuskyapp/Tusky","Tusky","A lightweight, fast Mastodon client for Android.","app",["Lightweight","Multiple accounts","Free"])]),
 ("telegram","Telegram","Telegram","chat","Cloud messaging and channels",[
   ("DrKLO/Telegram","Telegram for Android (source)","Telegram's own Android client, published as open source.","app",["Open source","Channels","Bots"])]),
 ("youtube","YouTube","Google","watch","Video platform",[
   ("TeamNewPipe/NewPipe","NewPipe","A lightweight YouTube front-end with background play and downloads.","app",["No ads","Background play","Downloads"]),
   ("libre-tube/LibreTube","LibreTube","A privacy-friendly YouTube client powered by Piped.","app",["No ads","SponsorBlock","Subscriptions without account"]),
   ("iv-org/invidious","Invidious","An alternative, privacy-respecting front-end for YouTube.","server",["No tracking","Self-hosted","API"]),
   ("FreeTubeApp/FreeTube","FreeTube","The private YouTube client for your desktop.","desktop",["No ads","Local subscriptions","Desktop"])]),
 ("x","X","X Corp","social","Microblogging and news",[
   ("bluesky-social/social-app","Bluesky","The open-source Bluesky client built on the AT Protocol.","app",["Open protocol","Custom feeds","Portable identity"])]),
 ("spotify","Spotify","Spotify","listen","Music and podcast streaming",[
   ("team-spotube/spotube","Spotube","A beautiful open-source music client that needs no premium account.","app",["No ads","Lyrics","Cross-platform"]),
   ("navidrome/navidrome","Navidrome","Stream your own music collection from anywhere.","server",["Self-hosted","Subsonic API","Lightweight"])]),
 ("gemini","Gemini","Google","ai","Google's AI assistant",[
   ("ollama/ollama","Ollama","Run powerful open models locally with one command.","engine",["Local AI","Private","Many models"]),
   ("a-ghorbani/pocketpal-ai","PocketPal AI","Chat with small language models fully on your phone.","app",["On-device","Offline","Private"]),
   ("mlc-ai/mlc-llm","MLC LLM","A universal engine to run LLMs natively on phones and GPUs.","engine",["On-device","GPU","Cross-platform"])]),
 ("reddit","Reddit","Reddit","social","Communities and discussions",[
   ("LemmyNet/lemmy","Lemmy","A federated link aggregator and discussion platform.","server",["Federated","Communities","No ads"]),
   ("Docile-Alligator/Infinity-For-Reddit","Infinity","A fast, gesture-rich Reddit client.","app",["Gestures","Themes","Multi-account"]),
   ("LemmyNet/jerboa","Jerboa","The official native Android app for Lemmy.","app",["Native","Federated","Free"])]),
 ("messenger","Messenger","Meta","chat","Chats, calls and group video",[
   ("element-hq/element-x-android","Element X","Next-gen Matrix messenger: fast, encrypted and federated.","app",["E2E encrypted","Federated","Calls"]),
   ("element-hq/element-web","Element Web","Matrix chat in your browser and on desktop.","web",["E2E encrypted","Bridges","Spaces"])]),
 ("google-photos","Google Photos","Google","create","Photo backup and memories",[
   ("immich-app/immich","Immich","High-performance self-hosted photo and video backup.","server",["Self-hosted","Face search","Auto backup"]),
   ("ente/ente","Ente","End-to-end encrypted photo storage with apps everywhere.","app",["E2E encrypted","Family plans","Open source"]),
   ("photoprism/photoprism","PhotoPrism","AI-powered photo library for the decentralised web.","server",["AI tagging","Maps","Self-hosted"])]),
 ("pinterest","Pinterest","Pinterest","social","Visual discovery and moodboards",[
   ("pinry/pinry","Pinry","A tiling image board to save, tag and share images.","server",["Self-hosted","Tags","Browser extension"])]),
 ("gmail","Gmail","Google","chat","Email by Google",[
   ("thunderbird/thunderbird-android","Thunderbird","Thunderbird's open-source email app for Android (formerly K-9 Mail).","app",["Any provider","OpenPGP","No ads"]),
   ("M66B/FairEmail","FairEmail","Fully featured, privacy-oriented email for Android.","app",["Privacy","Unified inbox","Offline"])]),
 ("chrome","Google Chrome","Google","web","Web browser",[
   ("brave/brave-browser","Brave","Fast Chromium browser with ad and tracker blocking built in.","app",["Ad blocking","Fast","Private"]),
   ("ungoogled-software/ungoogled-chromium","ungoogled-chromium","Chromium without Google's integration and tracking.","desktop",["De-Googled","No telemetry","Desktop"]),
   ("uazo/cromite","Cromite","Hardened Chromium for Android with ad blocking.","app",["Ad blocking","Anti-fingerprint","Android"])]),
 ("google-maps","Google Maps","Google","places","Maps and navigation",[
   ("organicmaps/organicmaps","Organic Maps","Offline maps and turn-by-turn navigation with zero tracking.","app",["Offline","No tracking","Hiking"])]),
 ("discord","Discord","Discord","chat","Communities with voice and chat",[
   ("stoatchat/for-web","Stoat","Community chat with servers and channels (formerly Revolt).","web",["Servers","Self-hostable","No ads"]),
   ("spacebarchat/server","Spacebar","A free, self-hostable chat server compatible with Discord.","server",["Self-hosted","Compatible API","Voice"])]),
 ("slack","Slack","Salesforce","work","Team messaging",[
   ("mattermost/mattermost","Mattermost","Secure team collaboration and messaging for technical teams.","server",["Self-hosted","Integrations","Playbooks"]),
   ("zulip/zulip","Zulip","Threaded team chat that keeps conversations organised.","server",["Topics","Self-hosted","Free cloud for OSS"])]),
 ("zoom","Zoom","Zoom","chat","Video meetings",[
   ("jitsi/jitsi-meet","Jitsi Meet","Secure, simple video meetings with no account needed.","server",["No account","E2E option","Self-hosted"]),
   ("bigbluebutton/bigbluebutton","BigBlueButton","Virtual classroom and webinar platform.","server",["Whiteboard","Breakout rooms","Recording"])]),
 ("teams","Microsoft Teams","Microsoft","work","Workplace chat and meetings",[
   ("RocketChat/Rocket.Chat","Rocket.Chat","Communication platform with chat, omnichannel and federation.","server",["Federated","Omnichannel","Self-hosted"])]),
 ("outlook","Outlook","Microsoft","chat","Email and calendar",[
   ("tutao/tutanota","Tuta","End-to-end encrypted mail and calendar apps.","app",["E2E encrypted","Calendar","No ads"])]),
 ("notion","Notion","Notion Labs","work","Docs, wikis and projects",[
   ("AppFlowy-IO/AppFlowy","AppFlowy","An AI workspace for docs, wikis and projects that you control.","app",["Local-first","AI","Cross-platform"]),
   ("toeverything/AFFiNE","AFFiNE","Docs, whiteboards and databases, merged into one canvas.","app",["Local-first","Whiteboard","Self-hosted"]),
   ("outline/outline","Outline","A fast, collaborative knowledge base for teams.","server",["Real-time","Markdown","Self-hosted"])]),
 ("google-translate","Google Translate","Google","web","Translation for 100+ languages",[
   ("LibreTranslate/LibreTranslate","LibreTranslate","Free and open machine translation API you can self-host.","server",["Offline","Self-hosted","API"])]),
 ("prime-video","Prime Video","Amazon","watch","Streaming films and series",[
   ("xbmc/xbmc","Kodi","The legendary open-source media center for every screen.","app",["Add-ons","Live TV","Every platform"])]),
 ("google-drive","Google Drive","Google","files","Cloud storage",[
   ("nextcloud/server","Nextcloud","A safe home for all your files, calendars and contacts.","server",["Self-hosted","Office","Calendar"]),
   ("nextcloud/android","Nextcloud for Android","Sync and share your Nextcloud files on Android.","app",["Auto upload","Offline files","Free"]),
   ("haiwen/seafile","Seafile","High-performance file syncing and sharing.","server",["Fast sync","Encryption","Self-hosted"])]),
 ("dropbox","Dropbox","Dropbox","files","File sync and sharing",[
   ("syncthing/syncthing","Syncthing","Continuous peer-to-peer file sync, no cloud needed.","desktop",["P2P","No cloud","Encrypted"])]),
 ("google-keep","Google Keep","Google","work","Quick notes and lists",[
   ("usememos/memos","Memos","A lightweight, self-hosted note feed for quick thoughts.","server",["Markdown","Self-hosted","Fast"]),
   ("PhilKes/NotallyX","NotallyX","A beautiful, minimal note app inspired by Keep.","app",["Offline","Lists","Reminders"])]),
 ("evernote","Evernote","Bending Spoons","work","Notes and web clipping",[
   ("laurent22/joplin","Joplin","Privacy-focused notes with sync, Markdown and web clipper.","app",["E2E encrypted sync","Markdown","Web clipper"]),
   ("streetwriters/notesnook","Notesnook","End-to-end encrypted notes that are actually pleasant.","app",["E2E encrypted","Rich text","Cross-platform"])]),
 ("microsoft-365","Microsoft 365","Microsoft","work","Word, Excel and PowerPoint",[
   ("ONLYOFFICE/DesktopEditors","ONLYOFFICE","Office suite with excellent Word, Excel and PowerPoint compatibility.","desktop",["MS compatible","PDF editor","Free"]),
   ("LibreOffice/core","LibreOffice","The world's most popular free office suite.","desktop",["Open formats","Full suite","Free"])]),
 ("google-docs","Google Docs","Google","work","Collaborative documents",[
   ("cryptpad/cryptpad","CryptPad","End-to-end encrypted, real-time collaborative office.","server",["E2E encrypted","Real-time","Self-hosted"]),
   ("ONLYOFFICE/DocumentServer","ONLYOFFICE Docs","Online editors for documents, spreadsheets and slides.","server",["Co-editing","MS compatible","Self-hosted"])]),
 ("trello","Trello","Atlassian","work","Kanban boards",[
   ("wekan/wekan","WeKan","The open-source kanban, built to replace Trello.","server",["Kanban","Self-hosted","Swimlanes"]),
   ("plankanban/planka","PLANKA","Elegant real-time kanban for teams.","server",["Real-time","Kanban","Self-hosted"])]),
 ("jira","Jira","Atlassian","work","Issue and project tracking",[
   ("makeplane/plane","Plane","Modern project management for issues, cycles and docs.","server",["Cycles","Docs","Self-hosted"]),
   ("opf/openproject","OpenProject","Classic and agile project management in one.","server",["Gantt","Agile","Self-hosted"])]),
 ("todoist","Todoist","Doist","work","To-do lists and tasks",[
   ("super-productivity/super-productivity","Super Productivity","To-dos with time tracking, timeboxing and integrations.","app",["Time tracking","Offline","Integrations"]),
   ("tasks/tasks","Tasks.org","Bringing Astrid's spirit to modern Android.","app",["Offline","CalDAV","Widgets"]),
   ("go-vikunja/vikunja","Vikunja","The open-source to-do app to organise everything.","server",["Kanban","Self-hosted","CalDAV"])]),
 ("zapier","Zapier","Zapier","work","No-code automations",[
   ("n8n-io/n8n","n8n","Fair-code workflow automation with native AI.","server",["400+ integrations","AI agents","Self-hosted"]),
   ("huginn/huginn","Huginn","Agents that watch the web and act on your behalf.","server",["Agents","Self-hosted","IFTTT-style"])]),
 ("miro","Miro","Miro","work","Online whiteboard",[
   ("excalidraw/excalidraw","Excalidraw","A virtual whiteboard with a lovely hand-drawn feel.","web",["Hand-drawn","Real-time","E2E sharing"]),
   ("tldraw/tldraw","tldraw","An infinite-canvas whiteboard and SDK.","web",["Infinite canvas","SDK","Real-time"])]),
 ("acrobat","Adobe Acrobat","Adobe","work","PDF tools",[
   ("Stirling-Tools/Stirling-PDF","Stirling PDF","Every PDF tool you need, locally hosted.","server",["50+ tools","Self-hosted","OCR"])]),
 ("google-calendar","Google Calendar","Google","work","Calendar and scheduling",[
   ("FossifyOrg/Calendar","Fossify Calendar","A clean, private, offline calendar for Android.","app",["Offline","CalDAV","No ads"]),
   ("Etar-Group/Etar-Calendar","Etar","Material-design calendar based on AOSP.","app",["Material","Agenda","Free"])]),
 ("youtube-music","YouTube Music","Google","listen","Music streaming",[
   ("MetrolistGroup/Metrolist","Metrolist","A Material You music client with synced lyrics and offline play.","app",["No ads","Synced lyrics","Offline"]),
   ("z-huang/InnerTune","InnerTune","A Material 3 YouTube Music client.","app",["No ads","Background play","Library sync"])]),
 ("castbox","Castbox","Castbox.FM","listen","Podcast player",[
   ("AntennaPod/AntennaPod","AntennaPod","A flexible podcast manager, no account required.","app",["No account","Open feeds","Statistics"])]),
 ("audible","Audible","Amazon","listen","Audiobooks",[
   ("advplyr/audiobookshelf","Audiobookshelf","Self-hosted audiobook and podcast server with apps.","server",["Self-hosted","Progress sync","Offline"])]),
 ("lightroom","Lightroom","Adobe","create","Photo editing and RAW",[
   ("darktable-org/darktable","darktable","A virtual lighttable and darkroom for photographers.","desktop",["RAW","Non-destructive","Free"])]),
 ("ibispaint","ibis Paint X","ibis","create","Digital drawing",[
   ("KDE/krita","Krita","Professional digital painting, free for everyone.","desktop",["Brushes","Animation","Android tablets"])]),
 ("canva","Canva","Canva","create","Design anything",[
   ("penpot/penpot","Penpot","The open-source design and prototyping platform.","web",["Open standards","Prototyping","Self-hosted"])]),
 ("remini","Remini","Bending Spoons","create","AI photo enhancer",[
   ("upscayl/upscayl","Upscayl","Free AI image upscaling that runs on your machine.","desktop",["Local AI","Batch","Free"])]),
 ("pixel-camera","Pixel Camera","Google","create","Camera app",[
   ("GrapheneOS/Camera","GrapheneOS Camera","Modern camera app with a focus on privacy.","app",["Privacy","QR scanning","No tracking"])]),
 ("gallery","Samsung Gallery","Samsung","create","Photos and videos on device",[
   ("FossifyOrg/Gallery","Fossify Gallery","A private, ad-free gallery for photos and videos.","app",["Offline","No ads","Editor"]),
   ("deckerst/aves","Aves","A beautiful gallery and metadata explorer.","app",["Maps","Metadata","Beautiful"])]),
 ("perplexity","Perplexity","Perplexity AI","ai","AI answer engine",[
   ("ItzCrazyKns/Perplexica","Perplexica","An AI-powered answer engine you can self-host.","server",["Cites sources","Local models","Self-hosted"])]),
 ("midjourney","Midjourney","Midjourney","ai","AI image generation",[
   ("Comfy-Org/ComfyUI","ComfyUI","The most powerful node-based diffusion interface.","desktop",["Local AI","Node graph","Every model"]),
   ("AUTOMATIC1111/stable-diffusion-webui","Stable Diffusion web UI","The classic web interface for Stable Diffusion.","desktop",["Local AI","Extensions","Inpainting"])]),
 ("character-ai","Character.AI","Character.AI","ai","Chat with AI characters",[
   ("SillyTavern/SillyTavern","SillyTavern","A power-user interface for character chat with any model.","server",["Any model","Characters","Extensions"])]),
 ("authenticator","Google Authenticator","Google","privacy","Two-factor codes",[
   ("beemdevelopment/Aegis","Aegis","A free, secure 2FA app with encrypted vaults.","app",["Encrypted vault","Backups","Biometrics"]),
   ("twofas/2fas-android","2FAS","Simple, free two-factor authentication.","app",["Browser extension","Backup","Free"])]),
 ("1password","1Password","AgileBits","privacy","Password manager",[
   ("bitwarden/android","Bitwarden","Open-source password manager for every device.","app",["E2E encrypted","Passkeys","Free tier"]),
   ("Kunzisoft/KeePassDX","KeePassDX","Lightweight KeePass vault for Android.","app",["Offline","KeePass","Autofill"]),
   ("dani-garcia/vaultwarden","Vaultwarden","Bitwarden-compatible server written in Rust.","server",["Self-hosted","Lightweight","Compatible"])]),
 ("nordvpn","NordVPN","Nord Security","privacy","VPN",[
   ("ProtonVPN/android-app","Proton VPN","Audited, open-source VPN with a free tier.","app",["Free tier","Secure Core","No logs"]),
   ("WireGuard/wireguard-android","WireGuard","The modern VPN tunnel, as a tiny Android app.","app",["Fast","Simple","Bring your own server"]),
   ("2dust/v2rayNG","v2rayNG","A V2Ray/Xray client for Android.","app",["Many protocols","Routing","Free"])]),
 ("adguard","AdGuard","AdGuard","privacy","Ad and tracker blocking",[
   ("AdAway/AdAway","AdAway","System-wide ad blocking using hosts files.","app",["System-wide","Hosts","Free"]),
   ("pi-hole/pi-hole","Pi-hole","Network-wide ad blocking via your own DNS.","server",["Network-wide","DNS","Self-hosted"])]),
 ("ccleaner","CCleaner","Gen Digital","system","Phone cleaner",[
   ("d4rken-org/sdmaid-se","SD Maid SE","System cleaning tool that actually knows Android.","app",["App cleaner","Storage analyzer","No ads"])]),
 ("gboard","Gboard","Google","system","Keyboard",[
   ("florisboard/florisboard","FlorisBoard","A private, customisable keyboard for Android.","app",["Private","Themes","Clipboard"]),
   ("Helium314/HeliBoard","HeliBoard","A privacy-conscious keyboard based on AOSP.","app",["Offline","Gesture typing","Themes"])]),
 ("nova-launcher","Nova Launcher","Branch","system","Home screen launcher",[
   ("LawnchairLauncher/lawnchair","Lawnchair","A Pixel-style launcher with endless customisation.","app",["Pixel-like","Icon packs","Gestures"])]),
 ("play-store","Google Play Store","Google","system","App store",[
   ("ImranR98/Obtainium","Obtainium","Get Android app updates straight from the source.","app",["Direct updates","GitHub releases","No store"]),
   ("Droid-ify/client","Droid-ify","A modern, Material F-Droid client.","app",["F-Droid","Material You","Fast"]),
   ("f-droid/fdroidclient","F-Droid","The catalogue of free and open-source Android apps.","app",["FOSS only","Reproducible","No tracking"])]),
 ("speedtest","Speedtest","Ookla","system","Internet speed test",[
   ("librespeed/speedtest","LibreSpeed","Lightweight speed test you can host yourself.","server",["No Flash","Self-hosted","Telemetry optional"])]),
 ("accuweather","AccuWeather","AccuWeather","system","Weather forecasts",[
   ("breezy-weather/breezy-weather","Breezy Weather","Gorgeous, feature-rich weather with many sources.","app",["Many sources","Widgets","No ads"])]),
 ("google-news","Google News","Google","web","News feed",[
   ("Ashinch/ReadYou","Read You","An elegant Material You RSS reader.","app",["RSS","Material You","Offline"]),
   ("FreshRSS/FreshRSS","FreshRSS","A free, self-hostable feed aggregator.","server",["Self-hosted","API","Multi-user"])]),
 ("waze","Waze","Google","places","Community-driven navigation",[
   ("osmandapp/OsmAnd","OsmAnd","Turn-by-turn navigation and offline maps from OpenStreetMap.","app",["Voice guidance","Offline","Plugins"])]),
 ("google-search","Google Search","Google","web","Web search",[
   ("searxng/searxng","SearXNG","A privacy-respecting metasearch engine.","server",["No tracking","70+ engines","Self-hosted"])]),
 ("grammarly","Grammarly","Grammarly","web","Writing assistant",[
   ("languagetool-org/languagetool","LanguageTool","Style and grammar checker for 25+ languages.","server",["25+ languages","Self-hosted","Browser add-ons"])]),
 ("life360","Life360","Life360","places","Family location sharing",[
   ("traccar/traccar","Traccar","Modern GPS tracking platform for any device.","server",["Self-hosted","200+ protocols","Geofences"]),
   ("owntracks/android","OwnTracks","Private location sharing to your own server.","app",["Your server","MQTT","Battery-friendly"])]),
 ("google-home","Google Home","Google","places","Smart home control",[
   ("home-assistant/core","Home Assistant","Open-source home automation that puts local control first.","server",["Local control","3000+ integrations","Automations"]),
   ("home-assistant/android","Home Assistant Companion","The Android companion app for Home Assistant.","app",["Widgets","Sensors","Notifications"])]),
 ("ring","Ring","Amazon","places","Home security cameras",[
   ("blakeblackshear/frigate","Frigate","NVR with real-time local object detection.","server",["Local AI","No cloud","Home Assistant"])]),
 ("strava","Strava","Strava","health","Running and cycling tracker",[
   ("OpenTracksApp/OpenTracks","OpenTracks","Sport tracking that respects your privacy.","app",["Offline","No account","Sensors"])]),
 ("myfitnesspal","MyFitnessPal","MyFitnessPal","health","Calorie and fitness tracker",[
   ("wger-project/wger","wger","Workout, nutrition and weight tracker.","app",["Workouts","Nutrition","Self-hosted"])]),
 ("headspace","Headspace","Headspace","health","Meditation",[
   ("meditohq/medito-app","Medito","Meditation that is free forever, from a non-profit.","app",["Free forever","Non-profit","Offline"])]),
 ("habitify","Habitify","Unstatic","health","Habit tracker",[
   ("iSoron/uhabits","Loop Habit Tracker","Build good habits with beautiful charts.","app",["Offline","Widgets","Charts"])]),
 ("ynab","YNAB","YNAB","money","Budgeting",[
   ("actualbudget/actual","Actual Budget","Local-first envelope budgeting with optional sync.","app",["Local-first","Envelope budgeting","Sync"]),
   ("firefly-iii/firefly-iii","Firefly III","A personal finance manager you host yourself.","server",["Self-hosted","Rules","Reports"])]),
 ("google-wallet","Google Wallet","Google","money","Cards, passes and loyalty",[
   ("CatimaLoyalty/Android","Catima","Loyalty cards, tickets and vouchers in one private app.","app",["Offline","Barcodes","No ads"])]),
 ("coinbase-wallet","Coinbase Wallet","Coinbase","money","Self-custody crypto wallet (now the Base app)",[
   ("rainbow-me/rainbow","Rainbow","A fun, simple Ethereum wallet for your NFTs and tokens.","app",["Self-custody","NFTs","Multi-chain"])]),
 ("trust-wallet","Trust Wallet","Trust Wallet","money","Multi-chain crypto wallet",[
   ("horizontalsystems/unstoppable-wallet-android","Unstoppable Wallet","Non-custodial multi-chain wallet with no sign-up.","app",["Non-custodial","Multi-chain","Privacy"])]),
 ("amazon","Amazon Shopping","Amazon","shop","Online shopping",[
   ("medusajs/medusa","Medusa","Building blocks for digital commerce.","server",["Headless","Plugins","Self-hosted"])]),
 ("shopify","Shopify","Shopify","shop","Online store builder",[
   ("saleor/saleor","Saleor","A headless, GraphQL commerce platform.","server",["GraphQL","Headless","Multi-channel"])]),
 ("duolingo","Duolingo","Duolingo","learn","Language learning",[
   ("LibreLingo/LibreLingo","LibreLingo","A community-owned language-learning platform.","web",["Community courses","No ads","Free"])]),
 ("quizlet","Quizlet","Quizlet","learn","Flashcards",[
   ("ankidroid/Anki-Android","AnkiDroid","Spaced-repetition flashcards that make memory stick.","app",["Spaced repetition","Offline","Shared decks"])]),
 ("classroom","Google Classroom","Google","learn","Classes and coursework",[
   ("moodle/moodle","Moodle","The world's open-source learning platform.","server",["Courses","Quizzes","Self-hosted"])]),
 ("kindle","Kindle","Amazon","learn","Ebooks",[
   ("koreader/koreader","KOReader","A document viewer built for e-ink and beyond.","app",["E-ink","EPUB & PDF","Sync"]),
   ("readest/readest","Readest","A modern, feature-rich ebook reader.","app",["Cross-platform","Sync","Annotations"])]),
 ("goodreads","Goodreads","Amazon","learn","Book tracking and reviews",[
   ("bookwyrm-social/bookwyrm","BookWyrm","Social reading and reviewing, decentralised.","server",["Federated","Reviews","Reading goals"])]),
 ("medium","Medium","Medium","social","Blogging and reading",[
   ("TryGhost/Ghost","Ghost","Independent publishing with memberships and newsletters.","server",["Newsletters","Memberships","Self-hosted"]),
   ("writefreely/writefreely","WriteFreely","A clean, minimalist, federated blogging platform.","server",["Federated","Minimal","Self-hosted"])]),
 ("quora","Quora","Quora","social","Questions and answers",[
   ("apache/answer","Apache Answer","A Q&A platform for teams and communities.","server",["Q&A","Plugins","Self-hosted"])]),
 ("twitch","Twitch","Amazon","watch","Live streaming",[
   ("owncast/owncast","Owncast","Self-hosted live video and web chat server.","server",["Self-hosted","Chat","Fediverse"]),
   ("crackededed/Xtra","Xtra","A feature-rich Twitch client for Android.","app",["Chat","VODs","Downloads"])]),
 ("mx-player","MX Player","Amazon","watch","Video player",[
   ("videolan/vlc-android","VLC for Android","The video player that plays everything.","app",["Plays everything","No ads","Subtitles"]),
   ("anilbeesetti/nextplayer","Next Player","A native video player built with Jetpack Compose.","app",["Material You","Gestures","No ads"]),
   ("mpv-android/mpv-android","mpv-android","The mpv media player, on Android.","app",["High quality","Scripts","Lightweight"])]),
 ("google-messages","Google Messages","Google","chat","SMS and RCS messaging",[
   ("FossifyOrg/Messages","Fossify Messages","A private, ad-free SMS and MMS app.","app",["Offline","No ads","Blocking"]),
   ("octoshrimpy/quik","QUIK","A maintained fork of QKSMS, the beautiful SMS app.","app",["Themes","Scheduled","No ads"])]),
 ("files-by-google","Files by Google","Google","files","File manager",[
   ("zhanghai/MaterialFiles","Material Files","An open-source Material Design file manager.","app",["Root","SMB & FTP","Archives"])]),
 ("shareit","SHAREit","Smart Media4U","files","Nearby file transfer",[
   ("localsend/localsend","LocalSend","Share files to nearby devices, no internet needed.","app",["No internet","Cross-platform","Encrypted"])]),
 ("teamviewer","TeamViewer","TeamViewer","files","Remote desktop",[
   ("rustdesk/rustdesk","RustDesk","Open-source remote desktop, with self-hosting.","app",["Self-hosted","Cross-platform","Encrypted"])]),
 ("minecraft","Minecraft","Mojang","play","Sandbox building",[
   ("luanti-org/luanti","Luanti","An open-source voxel game engine (formerly Minetest).","app",["Mods","Multiplayer","Android"])]),
 ("chess-com","Chess.com","Chess.com","play","Online chess",[
   ("lichess-org/lila","Lichess","Free, ad-free online chess for everyone.","server",["No ads","Free forever","Puzzles"]),
   ("lichess-org/mobile","Lichess Mobile","The official Lichess app for Android and iOS.","app",["Native","Offline puzzles","Free"])]),
 ("2048","2048","Various publishers","play","Sliding number puzzle",[
   ("gabrielecirulli/2048","2048 (original)","The original 2048 game, open source from day one.","web",["Original","Tiny","Free"])]),
 ("mario-kart","Mario Kart Tour","Nintendo","play","Kart racing",[
   ("supertuxkart/stk-code","SuperTuxKart","A free 3D kart racer with online multiplayer.","app",["Online play","Android","Free"])]),
 ("age-of-empires","Age of Empires","Microsoft","play","Historical real-time strategy",[
   ("0ad/0ad","0 A.D.","A free, historical real-time strategy game.","desktop",["RTS","Multiplayer","Free"])]),
 ("rollercoaster-tycoon","RollerCoaster Tycoon","Atari","play","Theme park builder",[
   ("OpenRCT2/OpenRCT2","OpenRCT2","An open-source re-implementation of RollerCoaster Tycoon 2.","desktop",["Multiplayer","Mods","Android"])]),
]

ORDER = """chatgpt instagram tiktok whatsapp capcut netflix facebook snapchat threads telegram youtube chrome google-maps gmail spotify gemini messenger google-photos x pinterest google-drive zoom teams amazon reddit discord google-search google-translate youtube-music prime-video outlook gboard files-by-google google-messages microsoft-365 duolingo play-store google-docs google-calendar google-wallet waze shareit mx-player google-keep authenticator perplexity canva twitch lightroom remini ibispaint gallery pixel-camera notion slack dropbox nordvpn speedtest accuweather minecraft chess-com character-ai kindle audible quizlet classroom google-news castbox strava myfitnesspal headspace life360 google-home ring coinbase-wallet trust-wallet shopify midjourney evernote trello jira todoist zapier miro acrobat 1password adguard ccleaner nova-launcher grammarly goodreads medium quora teamviewer ynab habitify 2048 mario-kart age-of-empires rollercoaster-tycoon""".split()
