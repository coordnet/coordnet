import * as blockies from "blockies-ts";

import { Method, Profile, ProfileCard, ProfileCardSubProfile } from "@/types";

import bannerPlaceholder from "./assets/banner-placeholder.svg?url";

/**
 * Extracts the base URL without query parameters.
 * @param url The full URL.
 * @returns The base URL.
 */
const getBaseUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}${parsedUrl.pathname}`;
  } catch {
    return url;
  }
};

const imageUrlCache: Record<string, string> = {};

export const getProfileImage = (
  profile: Profile | ProfileCardSubProfile | null | undefined,
  retina: boolean = false
) => {
  let imageUrl: string;

  if (profile?.profile_image) {
    imageUrl =
      retina && profile.profile_image_2x ? profile.profile_image_2x : profile.profile_image;
  } else {
    // Generate a blockie image if no profile image is available
    return blockies.create({ seed: profile?.id || "", size: 10, scale: 20 }).toDataURL();
  }

  const baseUrl = getBaseUrl(imageUrl);

  // Check if the base URL is already cached
  if (imageUrlCache[baseUrl]) return imageUrlCache[baseUrl];

  // Cache the signed URL
  imageUrlCache[baseUrl] = imageUrl;
  return imageUrl;
};

export const getProfileBannerImage = (
  profile: Profile | null | undefined,
  retina: boolean = false
) => {
  let imageUrl: string;

  if (profile?.banner_image) {
    imageUrl = retina && profile.banner_image_2x ? profile.banner_image_2x : profile.banner_image;
  } else {
    imageUrl = bannerPlaceholder;
  }

  const baseUrl = getBaseUrl(imageUrl);

  // Check if the base URL is already cached
  if (imageUrlCache[baseUrl]) return imageUrlCache[baseUrl];

  // Cache the signed URL
  imageUrlCache[baseUrl] = imageUrl;
  return imageUrl;
};

export const getProfileCardImage = (
  card: ProfileCard | Method | null | undefined,
  retina: boolean = false,
  thumbnail: boolean = false
) => {
  let imageUrl: string;

  if (!thumbnail && card?.image) {
    imageUrl = retina && card.image_2x ? card.image_2x : card.image;
  } else if (thumbnail && card?.image_thumbnail) {
    imageUrl = retina && card.image_thumbnail_2x ? card.image_thumbnail_2x : card.image_thumbnail;
  } else {
    imageUrl = bannerPlaceholder;
  }

  const baseUrl = getBaseUrl(imageUrl);

  // Check if the base URL is already cached
  if (imageUrlCache[baseUrl]) return imageUrlCache[baseUrl];

  // Cache the signed URL
  imageUrlCache[baseUrl] = imageUrl;
  return imageUrl;
};
