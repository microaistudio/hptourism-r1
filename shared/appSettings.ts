export const ENFORCE_CATEGORY_SETTING_KEY = "enforce_property_category";

export type CategoryEnforcementSetting = {
  enforce: boolean;
};

export const DEFAULT_CATEGORY_ENFORCEMENT: CategoryEnforcementSetting = {
  enforce: false,
};

export const normalizeCategoryEnforcementSetting = (
  value: unknown,
): CategoryEnforcementSetting => {
  if (typeof value === "boolean") {
    return { enforce: value };
  }

  if (value && typeof value === "object" && "enforce" in value) {
    const enforce = (value as { enforce?: unknown }).enforce;
    return {
      enforce: typeof enforce === "boolean" ? enforce : false,
    };
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return { enforce: true };
    }
    if (value.toLowerCase() === "false") {
      return { enforce: false };
    }
  }

  return DEFAULT_CATEGORY_ENFORCEMENT;
};
