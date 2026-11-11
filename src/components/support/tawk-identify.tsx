"use client";

import { useEffect } from "react";
import {
  loginTawkVisitor,
  type TawkVisitorProfile,
} from "@/lib/tawk-browser";

/** Links the Tawk visitor to the signed-in student after the embed loads. */
export function TawkIdentify(profile: TawkVisitorProfile) {
  const {
    userId,
    hash,
    email,
    firstName,
    lastName,
    classLevel,
    track,
    state,
    tier,
  } = profile;

  useEffect(() => {
    loginTawkVisitor({
      userId,
      hash,
      email,
      firstName,
      lastName,
      classLevel,
      track,
      state,
      tier,
    });
  }, [
    userId,
    hash,
    email,
    firstName,
    lastName,
    classLevel,
    track,
    state,
    tier,
  ]);

  return null;
}
