import * as blockies from "blockies-ts";

import { Profile, ProfileCardSubProfile } from "@/types";

export const getProfileImage = (
  profile: Profile | ProfileCardSubProfile | null | undefined,
  retina: boolean = false,
) => {
  return profile?.profile_image
    ? retina && profile?.profile_image_2x
      ? profile?.profile_image_2x
      : profile?.profile_image
    : blockies.create({ seed: profile?.id, size: 10, scale: 20 }).toDataURL();
};
