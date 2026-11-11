"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createProduct } from "@/app/admin/catalog-actions";
import { MarkdownDescription } from "@/components/MarkdownDescription";
import { useToast } from "@/components/ToastProvider";
import {
  ProductDiscountTierBuilder,
  ProductTagInput,
  ProductVariantBuilder,
} from "@/components/admin/ProductVisualFields";
import {
  productCreateFormSchema,
  type ProductCreateFieldErrors,
} from "@/lib/product-form-validation";

type CategoryOption = {
  id: string;
  name: string;
  tieredDiscountsEnabled: boolean;
};

const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function slugifyProductName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-extrabold tracking-tight text-[#20231b]">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-[#73786b]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <span className="mt-1 block text-xs font-medium text-red-700" role="alert">
      {children}
    </span>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-[#55594f]" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function uploadProgressLabel(completed: number, total: number): string {
  return completed === total
    ? "All images uploaded"
    : `Uploading image ${completed + 1} of ${total}…`;
}

async function uploadProductImage(file: File): Promise<string> {
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

export function ProductCreateForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [salePriceInput, setSalePriceInput] = useState("");
  const [discountAmountInput, setDiscountAmountInput] = useState("");
  const [originalPriceInput, setOriginalPriceInput] = useState("");
  const [pieceLengthInches, setPieceLengthInches] = useState("5");
  const [piecesPerPack, setPiecesPerPack] = useState("6");
  const [packWeightGrams, setPackWeightGrams] = useState("55");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [tieredDiscountSetting, setTieredDiscountSetting] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<Map<File, string>>(new Map());
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [isActive, setIsActive] = useState("true");
  const [trackInventory, setTrackInventory] = useState("true");
  const [previewItems, setPreviewItems] = useState<{ file: File; url: string }[]>([]);
  const [errors, setErrors] = useState<ProductCreateFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [imageError, setImageError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const saveDraftRef = useRef(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const previewItemsRef = useRef(previewItems);
  const basePrice = Number(originalPriceInput || priceInput);
  const finalSalePrice = discountAmountInput
    ? basePrice - Number(discountAmountInput)
    : Number(salePriceInput);
  const savingsPercent =
    basePrice > 0 && finalSalePrice > 0 && finalSalePrice < basePrice
      ? Math.round(((basePrice - finalSalePrice) / basePrice) * 100)
      : null;

  useEffect(() => {
    previewItemsRef.current = previewItems;
  }, [previewItems]);

  useEffect(
    () => () => {
      for (const preview of previewItemsRef.current) URL.revokeObjectURL(preview.url);
    },
    [],
  );

  function syncMediaInput(files: File[]) {
    if (!mediaInputRef.current) return;
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    mediaInputRef.current.files = transfer.files;
  }

  function setMediaFilesWithInput(files: File[]) {
    for (const preview of previewItemsRef.current) URL.revokeObjectURL(preview.url);
    const nextPreviews = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    previewItemsRef.current = nextPreviews;
    setPreviewItems(nextPreviews);
    setMediaFiles(files);
    setPrimaryImageIndex(0);
    setUploadedImageUrls(
      (current) => new Map([...current].filter(([file]) => files.includes(file))),
    );
    syncMediaInput(files);
  }

  function addMediaFiles(files: File[]) {
    if (!files.length) return;
    const allFiles = [...mediaFiles, ...files];
    if (allFiles.length > 20) {
      setImageError("Add no more than 20 product images.");
      syncMediaInput(mediaFiles);
      return;
    }
    const invalid = allFiles.find(
      (file) =>
        file.size > MAX_PRODUCT_IMAGE_SIZE ||
        (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)),
    );
    if (invalid) {
      setImageError("Choose JPG, PNG, WEBP, or GIF images up to 10 MB each.");
      syncMediaInput(mediaFiles);
      return;
    }
    setImageError("");
    setMediaFilesWithInput(allFiles);
  }

  function removeMedia(index: number) {
    const nextFiles = mediaFiles.filter((_, fileIndex) => fileIndex !== index);
    setMediaFilesWithInput(nextFiles);
  }

  function getFormErrors(rawValues: Record<string, FormDataEntryValue>): ProductCreateFieldErrors {
    const parsed = productCreateFormSchema.safeParse(rawValues);
    if (parsed.success) return {};
    const nextErrors: ProductCreateFieldErrors = {};
    for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (issues?.[0]) nextErrors[key as keyof ProductCreateFieldErrors] = issues[0];
    }
    return nextErrors;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    if (saveDraftRef.current) {
      values.isActive = "false";
      saveDraftRef.current = false;
    }
    const nextErrors = getFormErrors(values);
    setErrors(nextErrors);
    setFormError("");
    setImageError("");
    if (Object.keys(nextErrors).length > 0) {
      const invalidField = form.elements.namedItem(Object.keys(nextErrors)[0]);
      if (invalidField instanceof HTMLElement) invalidField.focus();
      return;
    }
    if (!form.reportValidity()) return;
    if (mediaFiles.length === 0) {
      setImageError("Add at least one product image.");
      mediaInputRef.current?.focus();
      return;
    }

    formData.set("isActive", String(values.isActive));
    formData.set(
      "tags",
      JSON.stringify(
        String(formData.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
    const uploadedUrls: string[] = [];

    startTransition(async () => {
      try {
        setUploadProgress(0);
        for (const [index, file] of mediaFiles.entries()) {
          const existingUrl = uploadedImageUrls.get(file);
          const imageUrl = existingUrl ?? (await uploadProductImage(file));
          uploadedUrls.push(imageUrl);
          if (!existingUrl) {
            setUploadedImageUrls((current) => new Map(current).set(file, imageUrl));
          }
          setUploadProgress(index + 1);
        }
        const primaryImageUrl = uploadedUrls[primaryImageIndex];
        formData.set("imageUrl", primaryImageUrl);
        formData.set(
          "imageUrls",
          JSON.stringify(uploadedUrls.filter((_, index) => index !== primaryImageIndex)),
        );
        formData.delete("mediaFiles");
        const result = await createProduct(formData);
        if (!result.ok) {
          setFormError(
            uploadedUrls.length
              ? `${result.error} Uploaded images are still available to reuse.`
              : result.error,
          );
          return;
        }
        showToast(result.message);
        router.push("/admin/products");
        router.refresh();
      } catch (error) {
        setFormError(
          uploadedUrls.length
            ? "The product could not be saved. Uploaded images are still available to reuse."
            : error instanceof Error
              ? error.message
              : "The product could not be saved. Please try again.",
        );
      } finally {
        setUploadProgress(null);
      }
    });
  }

  const progressValue =
    uploadProgress === null ? 0 : Math.round((uploadProgress / mediaFiles.length) * 100);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#f4f5f1]/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to products"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-black/10 bg-white text-[#42463b] transition hover:bg-[#eef2df] focus-visible:outline-2 focus-visible:outline-[#718126]"
            href="/admin/products"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="text-xs text-[#73786b]">
              <Link className="hover:text-[#53641d] hover:underline" href="/admin/products">
                Products
              </Link>
              <span aria-hidden="true" className="px-2">
                /
              </span>
              <span aria-current="page" className="font-semibold text-[#42463b]">
                Create product
              </span>
            </nav>
            <h1 className="mt-1 truncate text-lg font-black tracking-tight sm:text-xl">
              Create product
            </h1>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-[#65695f]">Add a product to your storefront catalog.</p>
            <span className="rounded-full bg-white px-3 py-1 text-[.65rem] font-bold uppercase tracking-wide text-[#687b26]">
              Product catalog
            </span>
          </div>

          {categories.length === 0 && (
            <p className="mb-5 rounded-lg border border-amber-700/20 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Create a category before adding products.{" "}
              <Link className="font-bold underline" href="/admin/categories">
                Manage categories
              </Link>
            </p>
          )}

          {formError && (
            <p
              aria-live="assertive"
              className="mb-5 rounded-lg border border-red-700/20 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {formError}
            </p>
          )}

          <form
            className="grid items-start gap-5 pb-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(18rem,1fr)]"
            id="product-create-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="space-y-5">
              <FormCard
                description="Add a clear name and description customers can find."
                title="General information"
              >
                <div className="space-y-4">
                  <div>
                    <FieldLabel htmlFor="product-name">Product name</FieldLabel>
                    <input
                      aria-describedby={errors.name ? "product-name-error" : undefined}
                      aria-invalid={Boolean(errors.name)}
                      autoFocus
                      className="admin-catalog-input transition-shadow focus:ring-2 focus:ring-[#718126]/20"
                      id="product-name"
                      maxLength={160}
                      name="name"
                      onChange={(event) => {
                        setName(event.target.value);
                        if (!slugManuallyEdited) setSlug(slugifyProductName(event.target.value));
                      }}
                      required
                      value={name}
                    />
                    <span id="product-name-error">
                      <FieldError>{errors.name}</FieldError>
                    </span>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-slug">URL slug</FieldLabel>
                    <div className="flex items-center rounded-md border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <span className="pl-3 text-sm text-[#73786b]">/shop/</span>
                      <input
                        aria-describedby={errors.slug ? "product-slug-error" : undefined}
                        aria-invalid={Boolean(errors.slug)}
                        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none"
                        id="product-slug"
                        maxLength={120}
                        name="slug"
                        onChange={(event) => {
                          setSlugManuallyEdited(true);
                          setSlug(event.target.value);
                        }}
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        required
                        value={slug}
                      />
                    </div>
                    <span id="product-slug-error">
                      <FieldError>{errors.slug}</FieldError>
                    </span>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-description">Description</FieldLabel>
                    <textarea
                      aria-describedby="product-description-help"
                      aria-invalid={Boolean(errors.description)}
                      className="admin-catalog-input min-h-36 resize-y py-3"
                      id="product-description"
                      maxLength={5000}
                      name="description"
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe the product… Markdown is supported."
                      required
                      rows={6}
                      value={description}
                    />
                    <p className="mt-1 text-[11px] text-[#73786b]" id="product-description-help">
                      Markdown headings, emphasis, links, and lists are supported. Maximum 5,000
                      characters.
                    </p>
                    <FieldError>{errors.description}</FieldError>
                    {description && (
                      <details className="mt-3 rounded-lg border border-black/10 bg-[#fafbf8] p-3">
                        <summary className="cursor-pointer text-xs font-bold text-[#687b26]">
                          Preview description
                        </summary>
                        <MarkdownDescription
                          className="mt-3 text-sm leading-6 text-[#55594f]"
                          description={description}
                        />
                      </details>
                    )}
                  </div>
                </div>
              </FormCard>

              <FormCard
                description="Upload up to 20 images. Select which image appears first in the product gallery."
                title="Media & assets"
              >
                <input
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  aria-describedby={imageError ? "product-images-error" : undefined}
                  className="sr-only"
                  id="product-media"
                  multiple
                  name="mediaFiles"
                  onChange={(event) => addMediaFiles([...(event.target.files ?? [])])}
                  ref={mediaInputRef}
                  required
                  type="file"
                />
                <label
                  className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-black/20 bg-[#fafbf8] px-4 py-7 text-center transition hover:border-[#718126] hover:bg-[#f4f5f1] focus-within:ring-2 focus-within:ring-[#718126]/30"
                  htmlFor="product-media"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addMediaFiles([...event.dataTransfer.files]);
                  }}
                >
                  <ImagePlus aria-hidden="true" className="mb-2 h-6 w-6 text-[#687b26]" />
                  <span className="text-sm font-bold text-[#42463b]">
                    Drop images here or <span className="underline">browse files</span>
                  </span>
                  <span className="mt-1 text-xs text-[#73786b]">
                    JPG, PNG, WEBP, or GIF · up to 10 MB each
                  </span>
                </label>
                {imageError && (
                  <p className="mt-2 text-xs text-red-700" id="product-images-error">
                    {imageError}
                  </p>
                )}

                {previewItems.length > 0 && (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {previewItems.map(({ file, url }, index) => (
                      <li
                        className={`overflow-hidden rounded-lg border bg-white ${
                          index === primaryImageIndex
                            ? "border-[#718126] ring-2 ring-[#718126]/20"
                            : "border-black/10"
                        }`}
                        key={`${file.name}-${file.lastModified}-${index}`}
                      >
                        <div className="relative aspect-square bg-[#f4f5f1]">
                          <Image
                            alt={`Preview of ${file.name}`}
                            className="object-contain p-2"
                            fill
                            src={url}
                            unoptimized
                          />
                          {index === primaryImageIndex && (
                            <span className="absolute left-2 top-2 rounded-full bg-[#a3bd32] px-2 py-1 text-[.6rem] font-extrabold uppercase text-[#171a14]">
                              Primary
                            </span>
                          )}
                          <button
                            aria-label={`Remove ${file.name}`}
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#42463b] shadow hover:bg-red-50 hover:text-red-700"
                            onClick={() => removeMedia(index)}
                            type="button"
                          >
                            <X aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2">
                          <span
                            className="min-w-0 truncate text-[.65rem] text-[#65695f]"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                          {index !== primaryImageIndex && (
                            <button
                              className="shrink-0 text-[.65rem] font-bold text-[#687b26] underline"
                              onClick={() => setPrimaryImageIndex(index)}
                              type="button"
                            >
                              Make primary
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {uploadProgress !== null && (
                  <div aria-live="polite" className="mt-4">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-[#42463b]">
                      <span>{uploadProgressLabel(uploadProgress, mediaFiles.length)}</span>
                      <span>{progressValue}%</span>
                    </div>
                    <progress
                      aria-label="Image upload progress"
                      className="h-2 w-full accent-[#718126]"
                      max={100}
                      value={progressValue}
                    />
                  </div>
                )}
              </FormCard>

              <FormCard
                description="Set your everyday price and any time-limited promotion."
                title="Pricing & discounts"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="product-price">Base price (USD)</FieldLabel>
                    <div className="mt-1 flex items-center rounded-lg border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <span
                        aria-hidden="true"
                        className="pl-3 text-sm font-semibold text-[#73786b]"
                      >
                        $
                      </span>
                      <input
                        aria-invalid={Boolean(errors.price)}
                        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none"
                        id="product-price"
                        inputMode="decimal"
                        min="0.01"
                        name="price"
                        onChange={(event) => setPriceInput(event.target.value)}
                        placeholder="9.99"
                        required
                        step="0.01"
                        type="number"
                        value={priceInput}
                      />
                    </div>
                    <FieldError>{errors.price}</FieldError>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-sale-price">Sale price (USD)</FieldLabel>
                    <div className="mt-1 flex items-center rounded-lg border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <span
                        aria-hidden="true"
                        className="pl-3 text-sm font-semibold text-[#73786b]"
                      >
                        $
                      </span>
                      <input
                        aria-invalid={Boolean(errors.salePrice)}
                        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none"
                        id="product-sale-price"
                        min="0.01"
                        name="salePrice"
                        onChange={(event) => {
                          setSalePriceInput(event.target.value);
                          if (event.target.value) setDiscountAmountInput("");
                        }}
                        placeholder="Optional"
                        step="0.01"
                        type="number"
                        value={salePriceInput}
                      />
                    </div>
                    <FieldError>{errors.salePrice}</FieldError>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-discount">Discount amount (USD)</FieldLabel>
                    <div className="mt-1 flex items-center rounded-lg border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <span
                        aria-hidden="true"
                        className="pl-3 text-sm font-semibold text-[#73786b]"
                      >
                        $
                      </span>
                      <input
                        aria-invalid={Boolean(errors.discountAmount)}
                        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none"
                        id="product-discount"
                        min="0.01"
                        name="discountAmount"
                        onChange={(event) => {
                          setDiscountAmountInput(event.target.value);
                          if (event.target.value) setSalePriceInput("");
                        }}
                        placeholder="Optional"
                        step="0.01"
                        type="number"
                        value={discountAmountInput}
                      />
                    </div>
                    <FieldError>{errors.discountAmount}</FieldError>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-original-price">
                      Original / compare-at price (USD)
                    </FieldLabel>
                    <div className="mt-1 flex items-center rounded-lg border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <span
                        aria-hidden="true"
                        className="pl-3 text-sm font-semibold text-[#73786b]"
                      >
                        $
                      </span>
                      <input
                        aria-invalid={Boolean(errors.originalPrice)}
                        className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-sm outline-none"
                        id="product-original-price"
                        min="0.01"
                        name="originalPrice"
                        onChange={(event) => setOriginalPriceInput(event.target.value)}
                        placeholder="Optional"
                        step="0.01"
                        type="number"
                        value={originalPriceInput}
                      />
                    </div>
                    <FieldError>{errors.originalPrice}</FieldError>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="product-sale-ends">Sale ends at</FieldLabel>
                    <input
                      aria-invalid={Boolean(errors.saleEndsAt)}
                      className="admin-catalog-input"
                      id="product-sale-ends"
                      name="saleEndsAt"
                      type="datetime-local"
                    />
                    <p className="mt-1 text-[11px] text-[#73786b]">
                      Promotional price applies until this date and time.
                    </p>
                    <FieldError>{errors.saleEndsAt}</FieldError>
                  </div>
                  <p className="rounded-lg bg-[#f4f5f1] px-3 py-3 text-xs leading-5 text-[#65695f] sm:col-span-2">
                    Enter a sale price or discount amount.{" "}
                    {savingsPercent === null
                      ? "Add a lower sale value to preview the savings."
                      : `Effective sale price: $${finalSalePrice.toFixed(2)} · You save ${savingsPercent}%.`}
                  </p>
                </div>
              </FormCard>

              <FormCard
                title="Variants"
                description="Add size, color, or custom product options with individual pricing and stock."
              >
                <ProductVariantBuilder basePrice={priceInput} />
              </FormCard>
              <FormCard
                title="Volume discounts"
                description="Reward customers who buy larger quantities."
              >
                <ProductDiscountTierBuilder />
              </FormCard>
            </div>

            <aside className="space-y-5">
              <FormCard title="Product organization">
                <div className="space-y-4">
                  <div>
                    <FieldLabel htmlFor="product-category">Category</FieldLabel>
                    <select
                      aria-invalid={Boolean(errors.categoryId)}
                      className="admin-catalog-input"
                      id="product-category"
                      name="categoryId"
                      onChange={(event) => setSelectedCategoryId(event.target.value)}
                      required
                      value={selectedCategoryId}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <FieldError>{errors.categoryId}</FieldError>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-brand">Brand / vendor</FieldLabel>
                    <input
                      aria-invalid={Boolean(errors.brand)}
                      className="admin-catalog-input"
                      id="product-brand"
                      maxLength={100}
                      name="brand"
                      placeholder="Brand name"
                    />
                    <FieldError>{errors.brand}</FieldError>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-tags">Collections & tags</FieldLabel>
                    <ProductTagInput />
                    <FieldError>{errors.tags}</FieldError>
                  </div>
                </div>
              </FormCard>

              <FormCard title="Inventory & settings">
                <div className="space-y-4">
                  <div>
                    <FieldLabel htmlFor="product-status">Status</FieldLabel>
                    <select
                      className="admin-catalog-input"
                      id="product-status"
                      name="isActive"
                      onChange={(event) => setIsActive(event.target.value)}
                      value={isActive}
                    >
                      <option value="false">Draft</option>
                      <option value="true">Active</option>
                    </select>
                    <p className="mt-1 text-[11px] text-[#73786b]">
                      Draft products stay hidden from the storefront.
                    </p>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-track-inventory">Inventory tracking</FieldLabel>
                    <select
                      className="admin-catalog-input"
                      id="product-track-inventory"
                      name="trackInventory"
                      onChange={(event) => setTrackInventory(event.target.value)}
                      value={trackInventory}
                    >
                      <option value="true">Track quantity</option>
                      <option value="false">Do not track quantity</option>
                    </select>
                    <p className="mt-1 text-[11px] text-[#73786b]">
                      Untracked products remain purchasable regardless of recorded stock.
                    </p>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-default-stock">
                      Default variant quantity
                    </FieldLabel>
                    <input
                      aria-invalid={Boolean(errors.defaultStock)}
                      className="admin-catalog-input"
                      defaultValue="0"
                      id="product-default-stock"
                      min="0"
                      name="defaultStock"
                      step="1"
                      type="number"
                    />
                    <FieldError>{errors.defaultStock}</FieldError>
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-tiered-discount-setting">
                      Quantity discount setting
                    </FieldLabel>
                    <select
                      className="admin-catalog-input"
                      id="product-tiered-discount-setting"
                      name="tieredDiscountsEnabled"
                      onChange={(event) => setTieredDiscountSetting(event.target.value)}
                      value={tieredDiscountSetting}
                    >
                      <option value="">Inherit category default</option>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                    <p className="mt-1 text-[11px] text-[#73786b]">
                      Category setting:{" "}
                      {categories.find((category) => category.id === selectedCategoryId)
                        ?.tieredDiscountsEnabled
                        ? "enabled"
                        : "disabled"}
                      .
                    </p>
                  </div>
                  <input name="imageUrl" type="hidden" value="" />
                  <input name="imageUrls" type="hidden" value="[]" />
                </div>
              </FormCard>
              <FormCard
                description="Specify the dimensions and net weight for a single retail pack."
                title="Physical & shipping specifications"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="piece-length-inches">Piece length</FieldLabel>
                    <div className="flex items-center rounded-md border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <input
                        aria-describedby={
                          errors.pieceLengthInches ? "piece-length-error" : undefined
                        }
                        aria-invalid={Boolean(errors.pieceLengthInches)}
                        className="min-h-11 min-w-0 flex-1 rounded-l-md border-0 bg-transparent px-3 text-sm outline-none"
                        id="piece-length-inches"
                        min="0.01"
                        name="pieceLengthInches"
                        onChange={(event) => setPieceLengthInches(event.target.value)}
                        required
                        step="any"
                        type="number"
                        value={pieceLengthInches}
                      />
                      <span
                        aria-hidden="true"
                        className="px-3 text-xs font-semibold text-[#73786b]"
                      >
                        in
                      </span>
                    </div>
                    <FieldError>{errors.pieceLengthInches}</FieldError>
                  </div>
                  <div>
                    <FieldLabel htmlFor="pieces-per-pack">Pieces per pack</FieldLabel>
                    <div className="flex items-center rounded-md border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <input
                        aria-describedby={
                          errors.piecesPerPack ? "pieces-per-pack-error" : undefined
                        }
                        aria-invalid={Boolean(errors.piecesPerPack)}
                        className="min-h-11 min-w-0 flex-1 rounded-l-md border-0 bg-transparent px-3 text-sm outline-none"
                        id="pieces-per-pack"
                        min="1"
                        name="piecesPerPack"
                        onChange={(event) => setPiecesPerPack(event.target.value)}
                        required
                        step="1"
                        type="number"
                        value={piecesPerPack}
                      />
                      <span
                        aria-hidden="true"
                        className="px-3 text-xs font-semibold text-[#73786b]"
                      >
                        pcs
                      </span>
                    </div>
                    <FieldError>{errors.piecesPerPack}</FieldError>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="pack-weight-grams">Pack weight</FieldLabel>
                    <div className="flex items-center rounded-md border border-black/15 bg-white focus-within:ring-2 focus-within:ring-[#718126]/20">
                      <input
                        aria-describedby={errors.packWeightGrams ? "pack-weight-error" : undefined}
                        aria-invalid={Boolean(errors.packWeightGrams)}
                        className="min-h-11 min-w-0 flex-1 rounded-l-md border-0 bg-transparent px-3 text-sm outline-none"
                        id="pack-weight-grams"
                        min="0.01"
                        name="packWeightGrams"
                        onChange={(event) => setPackWeightGrams(event.target.value)}
                        required
                        step="any"
                        type="number"
                        value={packWeightGrams}
                      />
                      <span
                        aria-hidden="true"
                        className="px-3 text-xs font-semibold text-[#73786b]"
                      >
                        g
                      </span>
                    </div>
                    <FieldError>{errors.packWeightGrams}</FieldError>
                  </div>
                </div>
              </FormCard>
            </aside>
          </form>
        </div>
      </div>

      <div className="z-30 shrink-0 border-t border-black/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,.06)] backdrop-blur sm:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
          <p className="col-span-2 flex min-h-8 items-center text-xs font-semibold text-[#65695f] sm:mr-auto sm:col-span-1">
            {mediaFiles.length} image{mediaFiles.length === 1 ? "" : "s"} added
          </p>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-black/15 bg-white px-4 text-xs font-bold text-[#42463b] hover:bg-[#f4f5f1] sm:w-auto"
            href="/admin/products"
          >
            Cancel
          </Link>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-black/15 bg-white px-3 text-[.65rem] font-bold text-[#42463b] hover:bg-[#f4f5f1] sm:w-auto sm:px-4 sm:text-xs"
            disabled={pending || categories.length === 0}
            form="product-create-form"
            onClick={() => {
              saveDraftRef.current = true;
              setIsActive("false");
            }}
            type="submit"
          >
            Save Draft
          </button>
          <button
            className="col-span-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#a3bd32] px-5 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1 sm:w-auto"
            disabled={pending || categories.length === 0}
            form="product-create-form"
            type="submit"
          >
            {pending ? (
              <>
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                {uploadProgress === null
                  ? "Saving…"
                  : uploadProgressLabel(uploadProgress, mediaFiles.length)}
              </>
            ) : (
              "Create Product"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
