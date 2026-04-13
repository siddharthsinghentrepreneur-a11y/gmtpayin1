export interface HomeBannerSlide {
  id: string;
  name: string;
  src: string;
}

export const HOME_BANNER_STORAGE_KEY = "gmtpay.homeBanners";
export const HOME_BANNER_EVENT = "gmtpay:home-banners-updated";

export const DEFAULT_HOME_BANNERS: HomeBannerSlide[] = [
  { id: "banner-1", name: "Banner 1", src: "/banners/banner1.png" },
  { id: "banner-2", name: "Banner 2", src: "/banners/banner2.png" },
  { id: "banner-3", name: "Banner 3", src: "/banners/banner3.png" },
];

function normalizeSlides(value: unknown): HomeBannerSlide[] {
  if (!Array.isArray(value)) {
    return DEFAULT_HOME_BANNERS;
  }

  const slides = value
    .map((item, index) => {
      if (
        !item ||
        typeof item !== "object" ||
        !("src" in item) ||
        !("name" in item) ||
        typeof item.src !== "string" ||
        typeof item.name !== "string"
      ) {
        return null;
      }

      const id = "id" in item && typeof item.id === "string"
        ? item.id
        : `banner-${index + 1}`;

      return {
        id,
        name: item.name,
        src: item.src,
      };
    })
    .filter((item): item is HomeBannerSlide => Boolean(item));

  return slides.length > 0 ? slides : DEFAULT_HOME_BANNERS;
}

export function readHomeBanners(): HomeBannerSlide[] {
  if (typeof window === "undefined") {
    return DEFAULT_HOME_BANNERS;
  }

  try {
    const raw = window.localStorage.getItem(HOME_BANNER_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_HOME_BANNERS;
    }

    return normalizeSlides(JSON.parse(raw));
  } catch {
    return DEFAULT_HOME_BANNERS;
  }
}

export function writeHomeBanners(slides: HomeBannerSlide[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSlides = normalizeSlides(slides);
  window.localStorage.setItem(HOME_BANNER_STORAGE_KEY, JSON.stringify(normalizedSlides));
  window.dispatchEvent(new CustomEvent(HOME_BANNER_EVENT, { detail: normalizedSlides }));
}

export function resetHomeBanners() {
  writeHomeBanners(DEFAULT_HOME_BANNERS);
}