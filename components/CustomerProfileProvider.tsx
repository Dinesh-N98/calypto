"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

export type CustomerProfile = {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  addresses: CustomerAddress[];
};

export type CustomerAddress = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type CustomerProfileUpdate = Partial<
  Pick<CustomerProfile, "firstName" | "lastName" | "phone" | "address">
>;

type ProfileStatus = "loading" | "ready" | "unauthenticated" | "error";

type ProfileLoadState = {
  userId: string;
  profile: CustomerProfile | null;
  status: ProfileStatus;
  error: string | null;
};

type CustomerProfileContextValue = {
  profile: CustomerProfile | null;
  status: ProfileStatus;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (update: CustomerProfileUpdate) => Promise<void>;
};

const CustomerProfileContext = createContext<CustomerProfileContextValue | null>(null);

function isCustomerProfile(value: unknown): value is CustomerProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    (profile.firstName === null || typeof profile.firstName === "string") &&
    (profile.lastName === null || typeof profile.lastName === "string") &&
    (profile.name === null || typeof profile.name === "string") &&
    typeof profile.email === "string" &&
    (profile.phone === null || typeof profile.phone === "string") &&
    (profile.address === null || typeof profile.address === "string") &&
    Array.isArray(profile.addresses) &&
    profile.addresses.every(
      (address) =>
        !!address &&
        typeof address === "object" &&
        typeof address.id === "string" &&
        typeof address.line1 === "string" &&
        (address.line2 === null || typeof address.line2 === "string") &&
        typeof address.city === "string" &&
        typeof address.postalCode === "string" &&
        typeof address.country === "string" &&
        typeof address.isDefault === "boolean",
    )
  );
}

async function getProfileFromResponse(response: Response): Promise<CustomerProfile> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Unable to load your profile.";
    throw new Error(message);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("profile" in payload) ||
    !isCustomerProfile(payload.profile)
  ) {
    throw new Error("The profile response was invalid.");
  }
  return payload.profile;
}

export function CustomerProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id ?? null;
  const [loadedState, setLoadedState] = useState<ProfileLoadState | null>(null);
  const requestController = useRef<AbortController | null>(null);

  const activeState =
    sessionStatus === "authenticated" && userId && loadedState?.userId === userId
      ? loadedState
      : null;
  const profile = activeState?.profile ?? null;
  const status: ProfileStatus =
    sessionStatus === "loading"
      ? "loading"
      : sessionStatus === "unauthenticated" || !userId
        ? "unauthenticated"
        : (activeState?.status ?? "loading");
  const error = activeState?.error ?? null;

  const fetchProfile = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/profile", { signal, cache: "no-store" });
    return getProfileFromResponse(response);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoadedState({ userId, profile: null, status: "loading", error: null });
    try {
      const nextProfile = await fetchProfile(controller.signal);
      setLoadedState({ userId, profile: nextProfile, status: "ready", error: null });
    } catch (fetchError) {
      if (controller.signal.aborted) return;
      setLoadedState({
        userId,
        profile: null,
        status: "error",
        error: fetchError instanceof Error ? fetchError.message : "Unable to load your profile.",
      });
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  }, [fetchProfile, userId]);

  useEffect(() => {
    requestController.current?.abort();
    if (sessionStatus === "unauthenticated" || !userId) {
      return;
    }
    if (sessionStatus === "loading") return;

    const controller = new AbortController();
    requestController.current = controller;
    void fetchProfile(controller.signal)
      .then((nextProfile) => {
        if (controller.signal.aborted) return;
        setLoadedState({ userId, profile: nextProfile, status: "ready", error: null });
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setLoadedState({
          userId,
          profile: null,
          status: "error",
          error: fetchError instanceof Error ? fetchError.message : "Unable to load your profile.",
        });
      })
      .finally(() => {
        if (requestController.current === controller) requestController.current = null;
      });

    return () => {
      controller.abort();
      if (requestController.current === controller) requestController.current = null;
    };
  }, [fetchProfile, sessionStatus, userId]);

  const updateProfile = useCallback(
    async (update: CustomerProfileUpdate) => {
      if (!userId) throw new Error("You must be signed in to update your profile.");

      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      setLoadedState({ userId, profile, status: "loading", error: null });
      try {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
          signal: controller.signal,
        });
        const nextProfile = await getProfileFromResponse(response);
        setLoadedState({ userId, profile: nextProfile, status: "ready", error: null });
      } catch (updateError) {
        if (controller.signal.aborted) throw updateError;
        const message =
          updateError instanceof Error ? updateError.message : "Unable to save your profile.";
        setLoadedState({ userId, profile, status: "error", error: message });
        throw new Error(message);
      } finally {
        if (requestController.current === controller) requestController.current = null;
      }
    },
    [profile, userId],
  );

  return (
    <CustomerProfileContext.Provider value={{ profile, status, error, refresh, updateProfile }}>
      {children}
    </CustomerProfileContext.Provider>
  );
}

export function useCustomerProfile() {
  const context = useContext(CustomerProfileContext);
  if (!context) {
    throw new Error("useCustomerProfile must be used within CustomerProfileProvider.");
  }
  return context;
}

export function useCustomerProfileAutofill(
  resolveFields: (profile: CustomerProfile) => Record<string, string | null | undefined>,
) {
  const { profile, status, error } = useCustomerProfile();
  const [formElement, setFormElement] = useState<HTMLFormElement | null>(null);
  const dirtyFields = useRef(new Set<string>());
  const formRef = useCallback((element: HTMLFormElement | null) => {
    setFormElement(element);
  }, []);

  const onChange: ChangeEventHandler<HTMLFormElement> = useCallback(
    (event: ChangeEvent<HTMLFormElement>) => {
      const target = event.target;
      if (
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
        target.name
      ) {
        dirtyFields.current.add(target.name);
      }
    },
    [],
  );

  useEffect(() => {
    if (status !== "ready" || !profile || !formElement) return;

    for (const [fieldName, value] of Object.entries(resolveFields(profile))) {
      if (!value || dirtyFields.current.has(fieldName)) continue;
      const field = formElement.elements.namedItem(fieldName);
      if (
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
        !field.value
      ) {
        field.value = value;
      }
    }
  }, [formElement, profile, resolveFields, status]);

  return { formRef, onChange, status, error };
}
