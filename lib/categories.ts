export const categories = [
  { slug: "worm", displayName: "Worm Bait" },
  { slug: "swimbait", displayName: "Swimbait" },
  { slug: "curly-tail-grub", displayName: "Curly-Tail Grub" },
  { slug: "jig", displayName: "Jig" },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];
