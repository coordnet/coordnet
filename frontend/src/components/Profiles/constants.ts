import { Link, Play, PlayCircle } from "lucide-react";

import LogoBluesky from "./assets/logo-bluesky";
import LogoTelegram from "./assets/logo-telegram";
import LogoX from "./assets/logo-x";

export const profilesIconMap = {
  website: { component: Link, title: "Website" },
  telegram_url: { component: LogoTelegram, title: "Telegram" },
  bluesky_url: { component: LogoBluesky, title: "Bluesky" },
  twitter_url: { component: LogoX, title: "X" },
} as const;

export const profileCardLinksMap = {
  video_url: { component: PlayCircle, title: "Video URL", note: "" },
  url: {
    component: Play,
    title: "Coordination Network URL",
    note: "Currently only visible to creator/author",
  },
} as const;
