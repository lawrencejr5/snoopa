# Snoopa - Project Context

## Project Mission

Snoopa is a proactive AI agent that hunts for verified facts (sports, tech, finance) and "snoops" them to users via a Greyhound mascot interface.
Now Snoopa is like a private investigator agent. This is just an app that you can converse with on what is currently happening and also tell it to track things that'll happen in the future and let you know.

So for example, I want to know how real madrid's injury list looks like, I ask snoopa and snoopa says that bellingham just went into injury, eder militao is recorvering faster, and then I'll be like, alright then, when eder militao is back in training, please let me know and then it saves a watchlist and when he returns, snoopa sends you a push notification.

Now where does snoopa get it's intel from? I actually use serper.dev to query and scrape the front page of google, so my intel is actually from google at the moment.

## Tech Stack

- **Frontend:** React Native (Expo Router v3+)
- **Backend:** Convex (Real-time DB & Cron Jobs)
- **Styling:** NativeWind (Tailwind CSS)
- **Fonts:** Space Grotesk (Headers), Geist (Body)
- **Design:** Tactical Luxury (Charcoal #141414, Bone #EBEBDF)

## Rules for Agents

- Always use the color palette defined in `constants/Colors.ts`.
- All our UI designs must be modern, clean, minimal but elegant at the same time.
- As for the font, please just use the font's with prefix FONT, don't use the GEIST font for now
- When writing Convex functions, always include type definitions and make use of snake_case for variables.
- Every code we write must be simple, dont complicate things that don't need to be complicated.
- Every feature must be "speed-optimized" (The Greyhound Spirit).
