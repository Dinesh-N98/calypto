"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ImagePlus,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createPromotion,
  deletePromotion,
  setPromotionActive,
  updatePromotion,
} from "@/app/admin/promotion-actions";
import { useToast } from "@/components/ToastProvider";

type PromotionRecord = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  discountType: "percentage" | "fixed";
  discountPercent: number | null;
  discountAmountCents: number | null;
  discountCode: string | null;
  isActive: boolean;
  startDate: string;
  endDate: string;
};
type ActionResult = { ok: true; message: string } | { ok: false; error: string };

type PromotionFormValues = {
  title: string;
  description: string;
  imageUrl: string;
  discountType: "percentage" | "fixed";
  discountPercent: string;
  discountAmount: string;
  discountCode: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type PromotionField = keyof PromotionFormValues;
type PromotionErrors = Partial<Record<PromotionField, string>>;

const MAX_PROMOTION_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_PROMOTION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validatePromotion(values: PromotionFormValues, hasImage: boolean): PromotionErrors {
  const errors: PromotionErrors = {};
  if (!values.title.trim()) errors.title = "Add a title for this promotion.";
  else if (values.title.trim().length > 120) errors.title = "Use 120 characters or fewer.";

  if (!values.description.trim()) errors.description = "Add a short description.";
  else if (values.description.trim().length > 2000)
    errors.description = "Use 2,000 characters or fewer.";
  if (!hasImage) errors.imageUrl = "Upload an image to continue.";

  if (values.discountType === "percentage") {
    if (
      values.discountPercent &&
      (!/^\d{1,3}$/.test(values.discountPercent) ||
        Number(values.discountPercent) < 1 ||
        Number(values.discountPercent) > 100)
    ) {
      errors.discountPercent = "Enter a whole number from 1 to 100.";
    }
  } else if (
    values.discountAmount &&
    (!/^\d{1,5}(?:\.\d{1,2})?$/.test(values.discountAmount) ||
      Number(values.discountAmount) <= 0 ||
      Number(values.discountAmount) > 10000)
  ) {
    errors.discountAmount = "Enter an amount up to $10,000 with up to 2 decimals.";
  }

  if (values.discountCode.length > 50) errors.discountCode = "Use 50 characters or fewer.";
  if (values.startDate && values.endDate && values.endDate < values.startDate)
    errors.endDate = "Choose an end date on or after the start date.";
  return errors;
}

function generateDiscountCode(title: string): string {
  const prefix =
    title
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8) || "OFFER";
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint8Array(4);
  crypto.getRandomValues(random);
  return `${prefix}${Array.from(random, (value) => alphabet[value % alphabet.length]).join("")}`;
}

function formatDiscount(promotion: PromotionRecord): string {
  if (promotion.discountType === "fixed" && promotion.discountAmountCents) {
    return `$${(promotion.discountAmountCents / 100).toFixed(2)} off`;
  }
  return promotion.discountPercent ? `${promotion.discountPercent}% off` : "";
}

function PromotionForm({
  promotion,
  onClose,
  onComplete,
}: {
  promotion?: PromotionRecord;
  onClose: () => void;
  onComplete: (result: ActionResult) => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(promotion?.imageUrl ?? "");
  const [imageError, setImageError] = useState("");
  const [touched, setTouched] = useState<Partial<Record<PromotionField, boolean>>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [values, setValues] = useState<PromotionFormValues>({
    title: promotion?.title ?? "",
    description: promotion?.description ?? "",
    imageUrl: promotion?.imageUrl ?? "",
    discountType: promotion?.discountType ?? "percentage",
    discountPercent: promotion?.discountPercent?.toString() ?? "",
    discountAmount: promotion?.discountAmountCents
      ? (promotion.discountAmountCents / 100).toFixed(2)
      : "",
    discountCode: promotion?.discountCode ?? "",
    startDate: promotion?.startDate ?? "",
    endDate: promotion?.endDate ?? "",
    isActive: promotion?.isActive ?? true,
  });
  const validationErrors = validatePromotion(values, Boolean(selectedImage || values.imageUrl));
  const descriptionLength = values.description.length;

  useEffect(
    () => () => {
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, pending]);

  function updateValue<Key extends PromotionField>(field: Key, value: PromotionFormValues[Key]) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function updateDate(field: "startDate" | "endDate", value: string) {
    updateValue(field, value);
    setTouched((current) => ({ ...current, startDate: true, endDate: true }));
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_PROMOTION_IMAGE_TYPES.includes(file.type)) {
      setImageError("Choose a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_PROMOTION_IMAGE_SIZE) {
      setImageError("Images must be 10 MB or smaller.");
      return;
    }

    setImageError("");
    setError("");
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewObjectUrlRef.current);
    setSelectedImage(file);
    updateValue("imageUrl", "");
  }

  async function uploadImage(file: File): Promise<string> {
    const uploadData = new FormData();
    uploadData.set("file", file);
    const response = await fetch("/api/admin/product-images", {
      method: "POST",
      body: uploadData,
    });
    const result: unknown = await response.json();
    if (
      response.ok &&
      typeof result === "object" &&
      result !== null &&
      "imageUrl" in result &&
      typeof result.imageUrl === "string"
    ) {
      return result.imageUrl;
    }
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "The image could not be uploaded. Please try again.";
    throw new Error(message);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setTouched({
      title: true,
      description: true,
      imageUrl: true,
      discountPercent: true,
      discountAmount: true,
      discountCode: true,
      startDate: true,
      endDate: true,
    });
    if (!form.reportValidity() || Object.keys(validationErrors).length > 0) return;
    const formData = new FormData(form);
    if (promotion) formData.set("id", promotion.id);

    startTransition(async () => {
      try {
        if (selectedImage) {
          const uploadedImageUrl = await uploadImage(selectedImage);
          formData.set("imageUrl", uploadedImageUrl);
          updateValue("imageUrl", uploadedImageUrl);
          setSelectedImage(null);
          setPreviewUrl(uploadedImageUrl);
          if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
          }
          if (imageInputRef.current) imageInputRef.current.value = "";
        }
        const result = promotion
          ? await updatePromotion(formData)
          : await createPromotion(formData);
        if (result.ok) onComplete(result);
        else {
          setError(result.error);
          showToast(result.error, "error");
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "The promotion could not be saved. Please try again.";
        setError(message);
        showToast(message, "error");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px] animate-[fade-in_180ms_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        aria-labelledby="promotion-form-title"
        aria-modal="true"
        className="flex h-full w-full max-w-5xl flex-col bg-[#f8f9f6] text-[#171a14] shadow-2xl transition-transform duration-300 motion-reduce:transition-none"
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-black/10 bg-white px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2df] text-[#53641d]">
              <Tag aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[.65rem] font-bold uppercase tracking-[.13em] text-[#718126]">
                Storefront campaign
              </p>
              <h2 className="mt-0.5 text-lg font-black sm:text-xl" id="promotion-form-title">
                {promotion ? "Edit promotion" : "Create promotion"}
              </h2>
            </div>
          </div>
          <button
            aria-label="Close promotion form"
            className="grid h-10 w-10 place-items-center rounded-lg text-[#55594f] transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#718126]"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
            {error && (
              <p
                aria-live="assertive"
                className="mb-5 rounded-lg border border-red-700/20 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <input name="imageUrl" type="hidden" value={values.imageUrl} />
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <div className="space-y-5">
                <section className="rounded-xl border border-black/[.08] bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-extrabold">Promotion details</h3>
                    <p className="mt-1 text-xs leading-5 text-[#73786b]">
                      Give your offer a clear name and a description customers can act on.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <label
                      className="block text-xs font-bold text-[#55594f]"
                      htmlFor="promotion-title"
                    >
                      Title
                      <input
                        autoFocus
                        aria-describedby={
                          touched.title && validationErrors.title
                            ? "promotion-title-error"
                            : undefined
                        }
                        aria-invalid={Boolean(touched.title && validationErrors.title)}
                        className="admin-catalog-input transition-shadow"
                        maxLength={120}
                        name="title"
                        onBlur={() => setTouched((current) => ({ ...current, title: true }))}
                        onChange={(event) => updateValue("title", event.target.value)}
                        placeholder="e.g. Summer essentials"
                        required
                        value={values.title}
                      />
                      {touched.title && validationErrors.title && (
                        <span
                          className="mt-1 block font-normal text-red-700"
                          id="promotion-title-error"
                        >
                          {validationErrors.title}
                        </span>
                      )}
                    </label>
                    <label
                      className="block text-xs font-bold text-[#55594f]"
                      htmlFor="promotion-description"
                    >
                      Description
                      <textarea
                        aria-describedby="promotion-description-count"
                        aria-invalid={Boolean(touched.description && validationErrors.description)}
                        className="admin-catalog-input min-h-32 resize-y py-3 transition-shadow"
                        maxLength={2000}
                        name="description"
                        onBlur={() => setTouched((current) => ({ ...current, description: true }))}
                        onChange={(event) => updateValue("description", event.target.value)}
                        placeholder="Tell customers what makes this offer worth claiming."
                        required
                        rows={4}
                        value={values.description}
                      />
                      <span className="mt-1 flex items-center justify-between font-normal">
                        {touched.description && validationErrors.description ? (
                          <span className="text-red-700">{validationErrors.description}</span>
                        ) : (
                          <span className="text-[#73786b]">Keep it concise and benefit-led.</span>
                        )}
                        <span className="text-[#73786b]" id="promotion-description-count">
                          {descriptionLength}/2,000
                        </span>
                      </span>
                    </label>
                    <div>
                      <label
                        className="block text-xs font-bold text-[#55594f]"
                        htmlFor="promotion-code"
                      >
                        Discount code <span className="font-normal text-[#73786b]">(optional)</span>
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          aria-invalid={Boolean(
                            touched.discountCode && validationErrors.discountCode,
                          )}
                          autoCapitalize="characters"
                          className="admin-catalog-input mt-0 uppercase tracking-[.08em] transition-shadow"
                          maxLength={50}
                          name="discountCode"
                          onBlur={() =>
                            setTouched((current) => ({ ...current, discountCode: true }))
                          }
                          onChange={(event) =>
                            updateValue("discountCode", event.target.value.toUpperCase())
                          }
                          placeholder="SUMMER15"
                          value={values.discountCode}
                        />
                        <button
                          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-black/15 px-3 text-xs font-bold text-[#42463b] transition hover:border-[#718126] hover:bg-[#f4f5f1] focus-visible:outline-2 focus-visible:outline-[#718126]"
                          onClick={() =>
                            updateValue("discountCode", generateDiscountCode(values.title))
                          }
                          type="button"
                        >
                          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                          Generate
                        </button>
                      </div>
                      {touched.discountCode && validationErrors.discountCode && (
                        <span className="mt-1 block text-xs font-normal text-red-700">
                          {validationErrors.discountCode}
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-xl border border-black/[.08] bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-extrabold">Campaign image</h3>
                    <p className="mt-1 text-xs leading-5 text-[#73786b]">
                      Use a landscape image to make your offer stand out on the storefront.
                    </p>
                  </div>
                  <input
                    accept={ACCEPTED_PROMOTION_IMAGE_TYPES.join(",")}
                    aria-label="Choose promotion image"
                    className="sr-only"
                    id="promotion-image-upload"
                    onChange={(event) => selectImage(event.target.files?.[0])}
                    ref={imageInputRef}
                    type="file"
                  />
                  <label
                    className="group flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-black/15 bg-[#fafaf8] p-4 text-center transition-colors hover:border-[#718126] hover:bg-[#f4f5f1] focus-within:outline-2 focus-within:outline-[#718126]"
                    htmlFor="promotion-image-upload"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      selectImage(event.dataTransfer.files[0]);
                    }}
                  >
                    {previewUrl ? (
                      <span className="relative block min-h-44 w-full overflow-hidden rounded-md bg-[#e9ebdf]">
                        <Image
                          alt="Promotion image preview"
                          className="object-cover"
                          fill
                          sizes="(min-width: 1024px) 40vw, 100vw"
                          src={previewUrl}
                          unoptimized
                        />
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 p-2 text-white opacity-0 transition group-hover:opacity-100">
                          <Upload aria-hidden="true" className="h-4 w-4" />
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#eef2df] text-[#53641d]">
                          <ImagePlus aria-hidden="true" className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-bold text-[#42463b]">
                          Drop an image here or{" "}
                          <span className="text-[#65771b] underline">browse files</span>
                        </span>
                        <span className="mt-1 text-xs font-normal text-[#73786b]">
                          JPG, PNG, WEBP, or GIF · up to 10 MB
                        </span>
                      </>
                    )}
                  </label>
                  {previewUrl && (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-xs text-[#73786b]">
                        {selectedImage?.name ?? "Current campaign image"}
                      </span>
                      <button
                        className="shrink-0 text-xs font-bold text-[#55594f] underline hover:text-[#161812]"
                        onClick={(event) => {
                          event.preventDefault();
                          setSelectedImage(null);
                          setPreviewUrl("");
                          updateValue("imageUrl", "");
                          setImageError("");
                          if (previewObjectUrlRef.current) {
                            URL.revokeObjectURL(previewObjectUrlRef.current);
                            previewObjectUrlRef.current = null;
                          }
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                        type="button"
                      >
                        Remove image
                      </button>
                    </div>
                  )}
                  {(imageError || (touched.imageUrl && validationErrors.imageUrl)) && (
                    <p aria-live="polite" className="mt-2 text-xs text-red-700">
                      {imageError || validationErrors.imageUrl}
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-black/[.08] bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-extrabold">Discount offer</h3>
                    <p className="mt-1 text-xs leading-5 text-[#73786b]">
                      This offer is displayed on your storefront; it does not apply a checkout
                      discount.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
                    <label
                      className="block text-xs font-bold text-[#55594f]"
                      htmlFor="promotion-discount-type"
                    >
                      Discount type
                      <select
                        className="admin-catalog-input transition-shadow"
                        id="promotion-discount-type"
                        name="discountType"
                        onChange={(event) => {
                          const discountType =
                            event.target.value === "fixed" ? "fixed" : "percentage";
                          updateValue("discountType", discountType);
                        }}
                        value={values.discountType}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Flat amount ($)</option>
                      </select>
                    </label>
                    {values.discountType === "percentage" ? (
                      <label
                        className="block text-xs font-bold text-[#55594f]"
                        htmlFor="promotion-discount-percent"
                      >
                        Discount rate
                        <span className="relative mt-1 block">
                          <input
                            aria-invalid={Boolean(
                              touched.discountPercent && validationErrors.discountPercent,
                            )}
                            className="admin-catalog-input mt-0 pr-10 transition-shadow"
                            id="promotion-discount-percent"
                            inputMode="numeric"
                            max={100}
                            min={1}
                            name="discountPercent"
                            onBlur={() =>
                              setTouched((current) => ({ ...current, discountPercent: true }))
                            }
                            onChange={(event) => updateValue("discountPercent", event.target.value)}
                            placeholder="15"
                            type="number"
                            value={values.discountPercent}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#73786b]">
                            %
                          </span>
                        </span>
                        {touched.discountPercent && validationErrors.discountPercent && (
                          <span className="mt-1 block font-normal text-red-700">
                            {validationErrors.discountPercent}
                          </span>
                        )}
                      </label>
                    ) : (
                      <label
                        className="block text-xs font-bold text-[#55594f]"
                        htmlFor="promotion-discount-amount"
                      >
                        Amount off
                        <span className="relative mt-1 block">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#73786b]">
                            $
                          </span>
                          <input
                            aria-invalid={Boolean(
                              touched.discountAmount && validationErrors.discountAmount,
                            )}
                            className="admin-catalog-input mt-0 pl-8 transition-shadow"
                            id="promotion-discount-amount"
                            inputMode="decimal"
                            min="0.01"
                            name="discountAmount"
                            onBlur={() =>
                              setTouched((current) => ({ ...current, discountAmount: true }))
                            }
                            onChange={(event) => updateValue("discountAmount", event.target.value)}
                            placeholder="10.00"
                            step="0.01"
                            type="number"
                            value={values.discountAmount}
                          />
                        </span>
                        {touched.discountAmount && validationErrors.discountAmount && (
                          <span className="mt-1 block font-normal text-red-700">
                            {validationErrors.discountAmount}
                          </span>
                        )}
                      </label>
                    )}
                  </div>
                </section>

                <section className="flex items-center justify-between gap-4 rounded-xl border border-black/[.08] bg-white p-5 shadow-sm sm:p-6">
                  <div>
                    <h3 className="text-sm font-extrabold">Promotion status</h3>
                    <p className="mt-1 text-xs leading-5 text-[#73786b]">
                      {values.isActive
                        ? "Visible to customers when in its date range."
                        : "Hidden from the storefront."}
                    </p>
                  </div>
                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      checked={values.isActive}
                      className="peer sr-only"
                      name="isActive"
                      onChange={(event) => updateValue("isActive", event.target.checked)}
                      role="switch"
                      type="checkbox"
                    />
                    <span className="h-7 w-12 rounded-full bg-[#d6d8cf] transition-colors peer-checked:bg-[#718126] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#718126]" />
                    <span className="pointer-events-none absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-transform peer-checked:translate-x-5">
                      {values.isActive && (
                        <Check aria-hidden="true" className="h-3 w-3 text-[#53641d]" />
                      )}
                    </span>
                    <span className="sr-only">{values.isActive ? "Active" : "Inactive"}</span>
                  </label>
                </section>

                <section className="rounded-xl border border-black/[.08] bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-extrabold">Schedule</h3>
                    <p className="mt-1 text-xs leading-5 text-[#73786b]">
                      Leave either date blank to keep that side of the schedule open.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      className="block text-xs font-bold text-[#55594f]"
                      htmlFor="promotion-start-date"
                    >
                      Starts on
                      <span className="relative mt-1 block">
                        <CalendarDays
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73786b]"
                        />
                        <input
                          className="admin-catalog-input mt-0 pl-9 transition-shadow"
                          id="promotion-start-date"
                          max={values.endDate || undefined}
                          name="startDate"
                          onChange={(event) => updateDate("startDate", event.target.value)}
                          type="date"
                          value={values.startDate}
                        />
                      </span>
                    </label>
                    <label
                      className="block text-xs font-bold text-[#55594f]"
                      htmlFor="promotion-end-date"
                    >
                      Ends on
                      <span className="relative mt-1 block">
                        <CalendarDays
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73786b]"
                        />
                        <input
                          aria-invalid={Boolean(touched.endDate && validationErrors.endDate)}
                          className="admin-catalog-input mt-0 pl-9 transition-shadow"
                          id="promotion-end-date"
                          min={values.startDate || undefined}
                          name="endDate"
                          onChange={(event) => updateDate("endDate", event.target.value)}
                          type="date"
                          value={values.endDate}
                        />
                      </span>
                      {touched.endDate && validationErrors.endDate && (
                        <span className="mt-1 block font-normal text-red-700">
                          {validationErrors.endDate}
                        </span>
                      )}
                    </label>
                  </div>
                </section>
              </div>
            </div>
          </div>
          <footer className="flex justify-end gap-3 border-t border-black/10 bg-white px-5 py-4 sm:px-8">
            <button
              className="min-h-11 rounded-md border border-black/15 px-4 text-xs font-bold transition hover:bg-[#f4f5f1]"
              disabled={pending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-[#a3bd32] px-5 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] transition hover:bg-[#b6cf45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#718126]"
              disabled={pending}
              type="submit"
            >
              {pending ? "Saving..." : promotion ? "Save changes" : "Create promotion"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function AdminPromotionsTable({ promotions }: { promotions: PromotionRecord[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formPromotion, setFormPromotion] = useState<PromotionRecord | null | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function completeAction(result: ActionResult, close?: () => void) {
    if (!result.ok) return;
    close?.();
    showToast(result.message);
    router.refresh();
  }

  function togglePromotion(promotion: PromotionRecord) {
    setPendingId(promotion.id);
    startTransition(async () => {
      try {
        const result = await setPromotionActive(promotion.id, !promotion.isActive);
        if (result.ok) completeAction(result);
        else showToast(result.error, "error");
      } catch {
        showToast("The promotion status could not be changed. Please try again.", "error");
      } finally {
        setPendingId(null);
      }
    });
  }

  function removePromotion(promotion: PromotionRecord) {
    if (!window.confirm(`Permanently delete "${promotion.title}"?`)) return;
    setPendingId(promotion.id);
    startTransition(async () => {
      try {
        const result = await deletePromotion(promotion.id);
        if (result.ok) completeAction(result);
        else showToast(result.error, "error");
      } catch {
        showToast("The promotion could not be deleted. Please try again.", "error");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-xs font-bold text-[#687b26] hover:underline" href="/admin">
            Admin dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Promotions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65695f]">
            Manage scheduled offers shown on the storefront homepage.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[#a3bd32] px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45] sm:self-auto"
          onClick={() => setFormPromotion(null)}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add promotion
        </button>
      </header>

      {promotions.length === 0 ? (
        <section className="rounded-lg border border-dashed border-black/20 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-bold">No promotions yet</h2>
          <p className="mt-2 text-sm text-[#65695f]">
            Create a promotion to add an offer to the storefront homepage.
          </p>
        </section>
      ) : (
        <section aria-label="Promotion list" className="grid gap-4 xl:grid-cols-2">
          {promotions.map((promotion) => (
            <article
              className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm"
              key={promotion.id}
            >
              <div className="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="relative min-h-44 bg-[#e9ebdf] sm:min-h-full">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="(min-width: 640px) 12rem, 100vw"
                    src={promotion.imageUrl}
                    unoptimized
                  />
                </div>
                <div className="min-w-0 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black">{promotion.title}</h2>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[.68rem] font-bold ${promotion.isActive ? "bg-green-50 text-green-800" : "bg-[#f1f2ee] text-[#65695f]"}`}
                      >
                        {promotion.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        aria-label={`Edit ${promotion.title}`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#55594f] hover:bg-[#eef2df] hover:text-[#53641d]"
                        onClick={() => setFormPromotion(promotion)}
                        title="Edit promotion"
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Delete ${promotion.title}`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#8f3b36] hover:bg-red-50 hover:text-red-800 disabled:opacity-40"
                        disabled={pending}
                        onClick={() => removePromotion(promotion)}
                        title="Delete promotion"
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-[#65695f]">
                    {promotion.description}
                  </p>
                  {(promotion.discountPercent ||
                    promotion.discountAmountCents ||
                    promotion.discountCode) && (
                    <p className="mt-3 text-sm font-bold text-[#53641d]">
                      {formatDiscount(promotion)}
                      {formatDiscount(promotion) && promotion.discountCode ? " · " : ""}
                      {promotion.discountCode ? `Code: ${promotion.discountCode}` : ""}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-[#73786b]">
                    {promotion.startDate ? formatDate(promotion.startDate) : "No start date"}
                    {" – "}
                    {promotion.endDate ? formatDate(promotion.endDate) : "No end date"}
                  </p>
                  <button
                    aria-label={`${promotion.isActive ? "Deactivate" : "Activate"} ${promotion.title}`}
                    aria-pressed={promotion.isActive}
                    className="mt-4 min-h-10 rounded-md border border-black/15 px-3 text-xs font-bold hover:bg-[#f4f5f1] disabled:opacity-50"
                    disabled={pending}
                    onClick={() => togglePromotion(promotion)}
                    type="button"
                  >
                    {pendingId === promotion.id
                      ? "Updating..."
                      : promotion.isActive
                        ? "Deactivate"
                        : "Activate"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {formPromotion !== undefined && (
        <PromotionForm
          onClose={() => setFormPromotion(undefined)}
          onComplete={(result) => completeAction(result, () => setFormPromotion(undefined))}
          promotion={formPromotion ?? undefined}
        />
      )}
    </div>
  );
}
