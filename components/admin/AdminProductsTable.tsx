"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteProduct, reorderProducts, updateProduct } from "@/app/admin/catalog-actions";
import { useToast } from "@/components/ToastProvider";
import {
  CurrencyInput,
  FieldError,
  FieldLabel,
  FormCard,
} from "@/components/admin/ProductFormPrimitives";
import {
  ProductDiscountTierBuilder,
  ProductTagInput,
  ProductVariantBuilder,
  type VariantValue,
} from "@/components/admin/ProductVisualFields";
import { usePricingState } from "@/components/admin/hooks/usePricingState";
import { formatPrice } from "@/lib/currency";
import {
  productCreateFormSchema,
  type ProductCreateFieldErrors,
} from "@/lib/product-form-validation";

export type CategoryOption = {
  id: string;
  name: string;
  tieredDiscountsEnabled: boolean;
};
export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  priceCents: number;
  salePriceCents: number | null;
  originalPriceCents: number | null;
  saleEndsAt: Date | null;
  tieredDiscountsEnabled: boolean | null;
  isActive: boolean;
  trackInventory: boolean;
  tags: string[];
  pieceLengthInches: number;
  piecesPerPack: number;
  packWeightGrams: number;
  categoryTieredDiscountsEnabled: boolean;
  imageUrl: string;
  images: { url: string }[];
  variants: {
    sku: string;
    size: string | null;
    color: string | null;
    priceCents: number;
    discountPriceCents: number | null;
    stock: number;
    imageUrl: string | null;
    weightKg: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
  }[];
  tieredDiscounts: { minQuantity: number; discountPercentage: number }[];
  categoryId: string;
  categoryName: string;
};
type ActionResult = { ok: true; message: string } | { ok: false; error: string };
const PAGE_SIZES = [10, 20] as const;
const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024;

function slugifyProductName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ProductFormFields({
  categories,
  product,
  imageUrl,
  onImageUrlChange,
  galleryUrls,
  onGalleryUrlsChange,
  errors,
}: {
  categories: CategoryOption[];
  product: ProductRecord;
  imageUrl: string;
  onImageUrlChange: (imageUrl: string) => void;
  galleryUrls: string[];
  onGalleryUrlsChange: (urls: string[]) => void;
  errors: ProductCreateFieldErrors;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId ?? "");
  const {
    priceInput,
    setPriceInput,
    salePriceInput,
    setSalePriceInput,
    originalPriceInput,
    setOriginalPriceInput,
    discountAmountInput,
    setDiscountAmountInput,
    finalSalePrice: discountSalePrice,
    savingsPercent: discountPercent,
  } = usePricingState({
    priceInput: (product.priceCents / 100).toFixed(2),
    salePriceInput: product.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : "",
    originalPriceInput: product.originalPriceCents
      ? (product.originalPriceCents / 100).toFixed(2)
      : "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");
  const [imageError, setImageError] = useState("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  useEffect(
    () => () => {
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    },
    [],
  );

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (file.type && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setImageError("Choose a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      setImageError("Images must be 10 MB or smaller.");
      return;
    }

    setImageError("");
    onImageUrlChange("");
    if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    previewObjectUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewObjectUrlRef.current);
    setSelectedImage(file);
    if (imageInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      imageInputRef.current.files = transfer.files;
    }
  }

  return (
    <>
      {product && <input name="id" type="hidden" value={product.id} />}
      <input name="imageUrl" type="hidden" value={imageUrl} />
      <input name="imageUrls" type="hidden" value={JSON.stringify(galleryUrls)} />
      <input name="defaultStock" type="hidden" value="0" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,1fr)]">
        <FormCard
          className="lg:col-start-1 lg:row-start-1"
          description="Product name, storefront URL, and product description."
          headingLevel="h3"
          title="General information"
        >
          <div className="grid gap-4">
            <div className="md:col-span-2">
              <FieldLabel
                className="text-xs font-bold text-[#55594f] md:col-span-2"
                htmlFor="product-edit-name"
              >
                Product name
              </FieldLabel>
              <input
                aria-invalid={Boolean(errors.name)}
                autoFocus
                className="admin-catalog-input"
                id="product-edit-name"
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  if (!slugManuallyEdited) setSlug(slugifyProductName(value));
                }}
                maxLength={160}
                name="name"
                required
                value={name}
              />
              <FieldError>{errors.name}</FieldError>
            </div>
            <div className="md:col-span-2">
              <FieldLabel
                className="text-xs font-bold text-[#55594f] md:col-span-2"
                htmlFor="product-edit-slug"
              >
                URL slug
              </FieldLabel>
              <input
                aria-invalid={Boolean(errors.slug)}
                className="admin-catalog-input"
                id="product-edit-slug"
                onChange={(event) => {
                  setSlugManuallyEdited(true);
                  setSlug(event.target.value);
                }}
                maxLength={120}
                name="slug"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
                value={slug}
              />
              <FieldError>{errors.slug}</FieldError>
            </div>
            <div className="md:col-span-2">
              <FieldLabel
                className="text-xs font-bold text-[#55594f] md:col-span-2"
                htmlFor="product-edit-description"
              >
                Description
              </FieldLabel>
              <textarea
                aria-invalid={Boolean(errors.description)}
                className="admin-catalog-input min-h-28 py-3"
                defaultValue={product?.description}
                id="product-edit-description"
                maxLength={5000}
                name="description"
                required
                rows={5}
              />
              <FieldError>{errors.description}</FieldError>
              <span className="mt-1 block text-[11px] font-normal">
                Markdown headings, emphasis, links, and lists are supported.
              </span>
            </div>
          </div>
        </FormCard>
        <FormCard
          className="lg:col-start-2 lg:row-start-3"
          description="Pack dimensions and quantities used for shipping."
          headingLevel="h3"
          title="Physical & shipping specifications"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#55594f]">
              Piece length (in)
              <input
                aria-invalid={Boolean(errors.pieceLengthInches)}
                className="admin-catalog-input"
                defaultValue={product?.pieceLengthInches ?? 5}
                min="0.01"
                name="pieceLengthInches"
                required
                step="any"
                type="number"
              />
              <FieldError>{errors.pieceLengthInches}</FieldError>
            </label>
            <label className="text-xs font-bold text-[#55594f]">
              Pieces per pack
              <input
                aria-invalid={Boolean(errors.piecesPerPack)}
                className="admin-catalog-input"
                defaultValue={product?.piecesPerPack ?? 6}
                min="1"
                name="piecesPerPack"
                required
                step="1"
                type="number"
              />
              <FieldError>{errors.piecesPerPack}</FieldError>
            </label>
            <label className="text-xs font-bold text-[#55594f]">
              Pack weight (g)
              <input
                aria-invalid={Boolean(errors.packWeightGrams)}
                className="admin-catalog-input"
                defaultValue={product?.packWeightGrams ?? 55}
                min="0.01"
                name="packWeightGrams"
                required
                step="any"
                type="number"
              />
              <FieldError>{errors.packWeightGrams}</FieldError>
            </label>
          </div>
        </FormCard>
        <FormCard
          className="lg:col-start-1 lg:row-start-3"
          description="Pricing, promotions, and inventory controls."
          headingLevel="h3"
          title="Pricing & discounts"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencyInput
              error={errors.price}
              id="product-edit-price"
              inputMode="decimal"
              label="Price (USD)"
              labelClassName="text-xs font-bold text-[#55594f]"
              name="price"
              onChange={setPriceInput}
              placeholder="9.99"
              required
              value={priceInput}
            />
            <CurrencyInput
              error={errors.salePrice}
              id="product-edit-sale-price"
              label="Sale price (USD)"
              labelClassName="text-xs font-bold text-[#55594f]"
              name="salePrice"
              onChange={setSalePriceInput}
              placeholder="Optional"
              value={salePriceInput}
            />
            <CurrencyInput
              error={errors.discountAmount}
              id="product-edit-discount"
              label="Discount amount (USD)"
              labelClassName="text-xs font-bold text-[#55594f]"
              name="discountAmount"
              onChange={setDiscountAmountInput}
              placeholder="Optional"
              value={discountAmountInput}
            />
            <CurrencyInput
              error={errors.originalPrice}
              id="product-edit-original-price"
              label="Original price (USD)"
              labelClassName="text-xs font-bold text-[#55594f]"
              name="originalPrice"
              onChange={setOriginalPriceInput}
              placeholder="Optional"
              value={originalPriceInput}
            />
            <p className="text-xs font-normal text-[#73786b] sm:col-span-2">
              Enter either a sale price or discount amount.{" "}
              {discountPercent === null
                ? "Enter a valid original price and lower sale/discount value to preview savings."
                : `Sale price: $${discountSalePrice.toFixed(2)} · ${discountPercent}% off`}
            </p>
            <label className="text-xs font-bold text-[#55594f] sm:col-span-2">
              Sale ends at
              <input
                aria-invalid={Boolean(errors.saleEndsAt)}
                className="admin-catalog-input"
                defaultValue={
                  product?.saleEndsAt
                    ? new Date(
                        product.saleEndsAt.getTime() -
                          product.saleEndsAt.getTimezoneOffset() * 60_000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                name="saleEndsAt"
                type="datetime-local"
              />
              <FieldError>{errors.saleEndsAt}</FieldError>
              <span className="mt-1 block text-[11px] font-normal">
                Promotional pricing applies until this date and time. Required for a sale.
              </span>
            </label>
          </div>
        </FormCard>
        <FormCard
          className="lg:col-start-2 lg:row-start-1"
          description="Category, brand, and collection tags."
          headingLevel="h3"
          title="Product organization"
        >
          <div className="grid gap-4">
            <label className="text-xs font-bold text-[#55594f]">
              Category
              <select
                aria-invalid={Boolean(errors.categoryId)}
                className="admin-catalog-input"
                name="categoryId"
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                required
                value={selectedCategoryId}
              >
                <option disabled value="">
                  Select a category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FieldError>{errors.categoryId}</FieldError>
            </label>
            <label className="text-xs font-bold text-[#55594f]">
              Brand / vendor
              <input
                aria-invalid={Boolean(errors.brand)}
                className="admin-catalog-input"
                defaultValue={product?.brand ?? ""}
                maxLength={100}
                name="brand"
                placeholder="Brand name"
              />
              <FieldError>{errors.brand}</FieldError>
            </label>
            <div className="text-xs font-bold text-[#55594f] md:col-span-2">
              Collections &amp; tags
              <ProductTagInput initialTags={product.tags} />
              <FieldError>{errors.tags}</FieldError>
            </div>
          </div>
        </FormCard>
        <FormCard
          className="lg:col-start-2 lg:row-start-2"
          description="Configure storefront availability and quantity tracking."
          headingLevel="h3"
          title="Inventory & settings"
        >
          <div className="grid gap-4">
            <label className="text-xs font-bold text-[#55594f]">
              Status
              <select
                className="admin-catalog-input"
                name="isActive"
                defaultValue={String(product.isActive)}
              >
                <option value="false">Draft</option>
                <option value="true">Active</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#55594f]">
              Inventory tracking
              <select
                className="admin-catalog-input"
                name="trackInventory"
                defaultValue={String(product.trackInventory)}
              >
                <option value="true">Track quantity</option>
                <option value="false">Do not track quantity</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#55594f]">
              Quantity discount setting
              <select
                className="admin-catalog-input"
                defaultValue={
                  product.tieredDiscountsEnabled === null
                    ? ""
                    : String(product.tieredDiscountsEnabled)
                }
                name="tieredDiscountsEnabled"
              >
                <option value="">Inherit category default</option>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
              <span className="mt-1 block text-[11px] font-normal">
                Category setting:{" "}
                {selectedCategory?.tieredDiscountsEnabled ? "enabled" : "disabled"}.
              </span>
            </label>
          </div>
        </FormCard>
        <FormCard
          className="lg:col-start-1 lg:row-start-2"
          description="Update the primary image and product gallery."
          headingLevel="h3"
          title="Media & assets"
        >
          <div className="grid gap-4">
            <div className="text-xs font-bold text-[#55594f] md:col-span-2">
              <span>Product image</span>
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                id="product-image-file"
                name="imageFile"
                onChange={(event) => selectImage(event.target.files?.[0])}
                ref={imageInputRef}
                required={!imageUrl && !selectedImage}
                type="file"
              />
              <label
                className="mt-1 flex min-h-32 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-black/20 bg-[#fafaf8] p-4 text-center text-sm font-medium text-[#55594f] transition hover:border-[#718126] hover:bg-[#f4f5f1]"
                htmlFor="product-image-file"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  selectImage(event.dataTransfer.files[0]);
                }}
              >
                {previewUrl ? (
                  <span className="relative block h-28 w-full max-w-56 overflow-hidden rounded">
                    <Image
                      alt="Product image preview"
                      className="object-contain"
                      fill
                      src={previewUrl}
                      unoptimized
                    />
                  </span>
                ) : (
                  <span>
                    Drop an image here or <span className="font-bold underline">browse files</span>
                    <span className="mt-1 block text-xs font-normal text-[#73786b]">
                      JPG, PNG, WEBP, or GIF · up to 10 MB
                    </span>
                  </span>
                )}
              </label>
              {(selectedImage || imageUrl) && (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-xs font-normal text-[#73786b]">
                    {selectedImage?.name ?? imageUrl}
                  </span>
                  <button
                    className="shrink-0 text-xs font-bold text-[#55594f] underline hover:text-[#161812]"
                    onClick={() => {
                      setSelectedImage(null);
                      onImageUrlChange("");
                      setImageError("");
                      if (previewObjectUrlRef.current) {
                        URL.revokeObjectURL(previewObjectUrlRef.current);
                        previewObjectUrlRef.current = null;
                      }
                      setPreviewUrl("");
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                    type="button"
                  >
                    Remove image
                  </button>
                </div>
              )}
              <div className="text-xs font-bold text-[#55594f] md:col-span-2">
                <label htmlFor="product-gallery-files">Additional gallery images</label>
                <input
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="admin-catalog-input mt-1"
                  id="product-gallery-files"
                  multiple
                  name="galleryImages"
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    const invalid = files.find(
                      (file) =>
                        file.size > MAX_PRODUCT_IMAGE_SIZE ||
                        (file.type &&
                          !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
                            file.type,
                          )),
                    );
                    if (invalid) {
                      setImageError(
                        "Gallery images must be JPG, PNG, WEBP, or GIF files up to 10 MB.",
                      );
                      event.target.value = "";
                      setGalleryFiles([]);
                      return;
                    }
                    setImageError("");
                    setGalleryFiles(files);
                  }}
                  ref={galleryInputRef}
                  type="file"
                />
                <span className="mt-1 block text-[11px] font-normal">
                  {galleryFiles.length
                    ? `${galleryFiles.length} image${galleryFiles.length === 1 ? "" : "s"} selected`
                    : `${galleryUrls.length} saved image${galleryUrls.length === 1 ? "" : "s"}`}
                </span>
                {galleryUrls.length > 0 && (
                  <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {galleryUrls.map((url) => (
                      <li
                        className="overflow-hidden rounded-lg border border-black/10 bg-white"
                        key={url}
                      >
                        <div className="relative aspect-square bg-[#f4f5f1]">
                          <Image
                            alt="Saved product gallery image"
                            className="object-contain p-2"
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            src={url}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 px-2 py-2">
                          <span className="min-w-0 truncate text-[.65rem] font-normal">{url}</span>
                          <button
                            aria-label={`Remove gallery image ${url}`}
                            className="shrink-0 underline"
                            onClick={() =>
                              onGalleryUrlsChange(
                                galleryUrls.filter((galleryUrl) => galleryUrl !== url),
                              )
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {imageError && (
                <p aria-live="polite" className="mt-2 text-xs font-normal text-red-800">
                  {imageError}
                </p>
              )}
            </div>
          </div>
        </FormCard>
        <FormCard
          className="lg:col-start-1 lg:row-start-4"
          description="Configure option combinations, individual pricing, and stock."
          headingLevel="h3"
          title="Variants"
        >
          <div className="grid gap-4">
            <ProductVariantBuilder
              basePrice={priceInput}
              initialVariants={product.variants.map((variant): VariantValue => ({
                title:
                  variant.size && variant.color
                    ? `${variant.size} · ${variant.color}`
                    : (variant.size ?? variant.color ?? ""),
                sku: variant.sku,
                size: variant.size ?? "",
                color: variant.color ?? "",
                price: (variant.priceCents / 100).toFixed(2),
                discountPrice: variant.discountPriceCents
                  ? (variant.discountPriceCents / 100).toFixed(2)
                  : "",
                stock: String(variant.stock),
                imageUrl: variant.imageUrl ?? "",
                weightKg: variant.weightKg === null ? "" : String(variant.weightKg),
                lengthCm: variant.lengthCm === null ? "" : String(variant.lengthCm),
                widthCm: variant.widthCm === null ? "" : String(variant.widthCm),
                heightCm: variant.heightCm === null ? "" : String(variant.heightCm),
              }))}
            />
          </div>
        </FormCard>
        <FormCard
          className="lg:col-start-1 lg:row-start-5"
          description="Reward customers who purchase larger quantities."
          headingLevel="h3"
          title="Volume discounts"
        >
          <ProductDiscountTierBuilder
            initialTiers={product.tieredDiscounts.map((tier) => ({
              minQuantity: String(tier.minQuantity),
              discountPercentage: String(tier.discountPercentage),
            }))}
          />
        </FormCard>
      </div>
    </>
  );
}

export function ProductEditForm({
  categories,
  product,
}: {
  categories: CategoryOption[];
  product: ProductRecord;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ProductCreateFieldErrors>({});
  const [imageUrl, setImageUrl] = useState(product.imageUrl);
  const [galleryUrls, setGalleryUrls] = useState(product.images.map((image) => image.url));

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
    const formData = new FormData(form);
    const parsed = productCreateFormSchema.safeParse(Object.fromEntries(formData.entries()));
    const nextFieldErrors: ProductCreateFieldErrors = {};
    if (!parsed.success) {
      for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (issues?.[0]) {
          nextFieldErrors[key as keyof ProductCreateFieldErrors] = issues[0];
        }
      }
    }
    setFieldErrors(nextFieldErrors);
    setError("");
    if (Object.keys(nextFieldErrors).length > 0) {
      const firstInvalidField = form.elements.namedItem(Object.keys(nextFieldErrors)[0]);
      if (
        firstInvalidField instanceof HTMLElement &&
        !(firstInvalidField instanceof HTMLInputElement && firstInvalidField.type === "hidden")
      ) {
        firstInvalidField.focus();
      }
      return;
    }
    if (!form.reportValidity()) return;
    const uploadedImageUrls: string[] = [];
    const uploadedGalleryImageUrls: string[] = [];

    startTransition(async () => {
      try {
        const imageFile = formData.get("imageFile");
        if (imageFile instanceof File && imageFile.size > 0) {
          const uploadedImageUrl = await uploadImage(imageFile);
          uploadedImageUrls.push(uploadedImageUrl);
          setImageUrl(uploadedImageUrl);
          formData.set("imageUrl", uploadedImageUrl);
        }
        const galleryFiles = formData
          .getAll("galleryImages")
          .filter((file): file is File => file instanceof File && file.size > 0);
        for (const file of galleryFiles) {
          const uploadedImageUrl = await uploadImage(file);
          uploadedImageUrls.push(uploadedImageUrl);
          uploadedGalleryImageUrls.push(uploadedImageUrl);
        }
        const galleryInput = form.elements.namedItem("galleryImages");
        if (galleryInput instanceof HTMLInputElement) galleryInput.value = "";
        const currentGallery: unknown = JSON.parse(String(formData.get("imageUrls") ?? "[]"));
        const savedGallery = Array.isArray(currentGallery)
          ? currentGallery.filter((url): url is string => typeof url === "string")
          : [];
        const nextGallery = [...new Set([...uploadedGalleryImageUrls, ...savedGallery])];
        setGalleryUrls(nextGallery);
        formData.set("imageUrls", JSON.stringify(nextGallery));
        formData.delete("imageFile");
        formData.delete("galleryImages");

        formData.set(
          "tags",
          JSON.stringify(
            String(formData.get("tags") ?? "")
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        );
        const result = await updateProduct(formData);
        if (result.ok) {
          showToast(result.message);
          router.push("/admin/products");
          router.refresh();
        } else {
          if (uploadedImageUrls.length > 0) {
            setError(`${result.error} The uploaded images are still stored and can be reused.`);
          } else {
            setError(result.error);
          }
        }
      } catch (caughtError) {
        if (uploadedGalleryImageUrls.length > 0) {
          setGalleryUrls((current) => [...new Set([...current, ...uploadedGalleryImageUrls])]);
        }
        const imageInput = form.elements.namedItem("imageFile");
        if (imageInput instanceof HTMLInputElement) imageInput.value = "";
        const galleryInput = form.elements.namedItem("galleryImages");
        if (galleryInput instanceof HTMLInputElement) galleryInput.value = "";
        const detail =
          caughtError instanceof Error
            ? caughtError.message
            : "The product could not be saved. Please try again.";
        setError(
          uploadedImageUrls.length > 0
            ? `${detail} Uploaded images are still stored and can be reused.`
            : detail,
        );
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="sticky top-0 z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#f4f5f1]/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to products"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-black/10 bg-white text-[#42463b] transition hover:bg-[#eef2df] focus-visible:outline-2 focus-visible:outline-[#718126]"
            href="/admin/products"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
          <div>
            <nav aria-label="Breadcrumb" className="text-xs font-semibold text-[#73786b]">
              <Link className="transition-colors hover:text-[#53641d]" href="/admin/products">
                Products
              </Link>
              <span aria-hidden="true" className="px-2">
                /
              </span>
              <span aria-current="page" className="text-[#53641d]">
                Edit product
              </span>
            </nav>
            <h1 className="mt-1 max-w-[min(60vw,48rem)] truncate text-lg font-black tracking-tight sm:text-xl">
              Edit {product.name}
            </h1>
          </div>
        </div>
      </header>
      <form className="flex min-h-0 flex-1 flex-col" id="product-edit-form" onSubmit={handleSubmit}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-28 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <p className="mb-5 text-sm text-[#65695f]">
              Update product details, pricing, and inventory.
            </p>
            {error && (
              <p
                aria-live="assertive"
                className="mb-5 rounded-lg border border-red-700/20 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <ProductFormFields
              categories={categories}
              imageUrl={imageUrl}
              galleryUrls={galleryUrls}
              onImageUrlChange={setImageUrl}
              onGalleryUrlsChange={setGalleryUrls}
              errors={fieldErrors}
              product={product}
            />
          </div>
        </div>
        <footer className="sticky bottom-0 z-30 flex shrink-0 items-center gap-3 border-t border-black/10 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,.06)] backdrop-blur sm:px-8">
          <p className="mr-auto hidden text-xs font-medium text-[#65695f] sm:block">
            Editing <span className="font-bold text-[#42463b]">{product.name}</span>
          </p>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-black/15 bg-white px-4 text-xs font-bold text-[#42463b] transition hover:bg-[#f4f5f1]"
            href="/admin/products"
          >
            Cancel
          </Link>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#a3bd32] px-5 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] transition hover:bg-[#b6cf45]"
            disabled={pending}
            type="submit"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ProductDeleteDialog({
  product,
  onCancel,
  onComplete,
}: {
  product: ProductRecord;
  onCancel: () => void;
  onComplete: (result: ActionResult) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function confirmDelete() {
    const formData = new FormData();
    formData.set("id", product.id);
    startTransition(async () => {
      try {
        const result = await deleteProduct(formData);
        if (result.ok) onComplete(result);
        else setError(result.error);
      } catch {
        setError("The product could not be deleted. Please try again.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[55] grid place-items-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <section
        aria-labelledby="delete-product-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <h2 className="text-lg font-black" id="delete-product-title">
          Delete product?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#65695f]">
          This will permanently remove <strong className="text-[#161812]">{product.name}</strong>{" "}
          from the catalog.
        </p>
        {error && (
          <p aria-live="assertive" className="mt-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="min-h-11 rounded-md border border-black/15 px-4 text-xs font-bold hover:bg-[#f4f5f1]"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-11 rounded-md bg-red-700 px-4 text-xs font-bold text-white hover:bg-red-800"
            disabled={pending}
            onClick={confirmDelete}
            type="button"
          >
            {pending ? "Deleting..." : "Delete product"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function AdminProductsTable({
  categories,
  products,
}: {
  categories: CategoryOption[];
  products: ProductRecord[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [draftOrder, setDraftOrder] = useState<ProductRecord[] | null>(null);
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        deleteTarget ||
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || target.matches("input, textarea, select")))
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }

    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, [deleteTarget]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLocaleLowerCase().includes(query) ||
        product.slug.toLocaleLowerCase().includes(query);
      const matchesCategory = categoryId === "all" || product.categoryId === categoryId;
      return matchesSearch && matchesCategory;
    });
  }, [categoryId, products, search]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const productsToDisplay = draftOrder ?? visibleProducts;
  const hasOrderChanged =
    draftOrder?.some((product, index) => product.id !== products[index]?.id) ?? false;
  const firstResult = filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastResult = Math.min(currentPage * pageSize, filteredProducts.length);

  function moveProduct(sourceId: string, targetId: string) {
    if (!draftOrder || isSavingOrder || sourceId === targetId) return;

    const nextOrder = [...draftOrder];
    const sourceIndex = nextOrder.findIndex((product) => product.id === sourceId);
    const targetIndex = nextOrder.findIndex((product) => product.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [movedProduct] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, movedProduct);
    setDraftOrder(nextOrder);
  }

  async function saveProductOrder() {
    if (!draftOrder || !hasOrderChanged || isSavingOrder) return;
    setIsSavingOrder(true);

    try {
      const result = await reorderProducts(
        draftOrder.map((product, displayOrder) => ({ id: product.id, displayOrder })),
      );
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }

      setDraftOrder(null);
      showToast(result.message);
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save product order.", "error");
    } finally {
      setIsSavingOrder(false);
      setDraggedProductId(null);
      setDragOverProductId(null);
    }
  }

  function completeAction(result: ActionResult, close?: () => void) {
    if (!result.ok) return;
    close?.();
    showToast(result.message);
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-xs font-bold text-[#687b26] hover:underline" href="/admin">
            Admin dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Products</h1>
          <p className="mt-2 text-sm leading-6 text-[#65695f]">
            Search, organize, and manage your storefront catalog. Use reorder mode to set the
            storefront product order.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {!draftOrder && products.length > 0 && (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/15 bg-white px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#42463b] hover:bg-[#f7f8f5]"
              onClick={() => {
                setSearch("");
                setCategoryId("all");
                setPage(1);
                setDraftOrder(products);
              }}
              type="button"
            >
              Reorder storefront
            </button>
          )}
          {!draftOrder && (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#a3bd32] px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45]"
              aria-disabled={categories.length === 0}
              href={categories.length === 0 ? "/admin/categories" : "/admin/products/new"}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add product
            </Link>
          )}
        </div>
      </header>

      {categories.length === 0 && (
        <p className="rounded-md border border-amber-700/20 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Create a category before adding products.{" "}
          <Link className="font-bold underline" href="/admin/categories">
            Manage categories
          </Link>
        </p>
      )}

      <section className="flex min-h-[30rem] flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
        <div
          className={
            draftOrder
              ? "hidden"
              : "flex shrink-0 flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          }
        >
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">Search products</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73786b]"
            />
            <input
              aria-keyshortcuts="/"
              className="min-h-10 w-full rounded-lg border border-black/15 bg-white pl-9 pr-14 text-sm outline-none transition focus:border-[#718126] focus:ring-2 focus:ring-[#718126]/20"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name or slug..."
              ref={searchRef}
              type="search"
              value={search}
            />
            {search && (
              <button
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-[#73786b] hover:bg-black/5"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                  searchRef.current?.focus();
                }}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
            {!search && (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-black/10 bg-[#f7f8f5] px-1.5 py-0.5 text-[.65rem] font-semibold text-[#73786b]"
              >
                /
              </kbd>
            )}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#55594f]">
              Category
              <select
                className="min-h-10 rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold transition focus:border-[#718126] focus:outline-none focus:ring-2 focus:ring-[#718126]/20"
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
                value={categoryId}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-[#55594f]">
              Rows
              <select
                className="min-h-10 rounded-lg border border-black/15 bg-white px-3 text-xs font-semibold transition focus:border-[#718126] focus:outline-none focus:ring-2 focus:ring-[#718126]/20"
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                  setPage(1);
                }}
                value={pageSize}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {draftOrder && (
          <div className="flex shrink-0 flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[#55594f]">
              Drag a product grip or use the arrow keys to arrange all products, including drafts.
              Save when you are done.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                className="min-h-10 rounded-md border border-black/15 px-4 text-xs font-bold uppercase tracking-wide text-[#42463b] hover:bg-[#f7f8f5] disabled:opacity-50"
                disabled={isSavingOrder}
                onClick={() => {
                  setDraftOrder(null);
                  setDraggedProductId(null);
                  setDragOverProductId(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-10 rounded-md bg-[#a3bd32] px-4 text-xs font-extrabold uppercase tracking-wide text-[#171a14] hover:bg-[#b6cf45] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasOrderChanged || isSavingOrder}
                onClick={() => void saveProductOrder()}
                type="button"
              >
                {isSavingOrder ? "Saving..." : "Save order"}
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#f7f8f5] text-[.65rem] uppercase tracking-[.1em] text-[#73786b] shadow-[0_1px_0_rgba(0,0,0,.08)]">
              <tr>
                {draftOrder && (
                  <th className="w-12 px-2 py-3 font-bold">
                    <span className="sr-only">Reorder</span>
                  </th>
                )}
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 text-right font-bold">Price</th>
                <th
                  className={draftOrder ? "hidden" : "px-4 py-3 text-right font-bold"}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {productsToDisplay.map((product, index) => (
                <tr
                  className={`transition-colors hover:bg-[#fafbf8] focus-within:bg-[#fafbf8] ${dragOverProductId === product.id ? "border-t-2 border-[#718126]" : ""} ${draggedProductId === product.id ? "opacity-50" : ""}`}
                  key={product.id}
                  onDragOver={(event) => {
                    if (!draftOrder || isSavingOrder || !draggedProductId) return;
                    event.preventDefault();
                    setDragOverProductId(product.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedProductId) moveProduct(draggedProductId, product.id);
                  }}
                >
                  {draftOrder && (
                    <td className="px-2 py-3">
                      <button
                        aria-label={`Reorder ${product.name}; position ${index + 1} of ${draftOrder.length}. Use arrow keys to move.`}
                        className="grid h-9 w-9 cursor-grab place-items-center rounded-md text-[#73786b] hover:bg-[#eef2df] hover:text-[#53641d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#718126] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={isSavingOrder}
                        draggable={!isSavingOrder}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", product.id);
                          setDraggedProductId(product.id);
                        }}
                        onDragEnd={() => {
                          setDraggedProductId(null);
                          setDragOverProductId(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                          event.preventDefault();
                          const target = draftOrder[index + (event.key === "ArrowUp" ? -1 : 1)];
                          if (target) moveProduct(product.id, target.id);
                        }}
                        title="Drag to reorder, or use the arrow keys"
                        type="button"
                      >
                        <GripVertical aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-black/5 bg-[#f2f3ee]">
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          loading="lazy"
                          sizes="40px"
                          src={product.imageUrl}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-[#161812]">
                            {product.name}
                          </p>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[.58rem] font-extrabold uppercase tracking-wide ${
                              product.isActive
                                ? "border-[#dfe8bb] bg-[#f0f5dd] text-[#53641d]"
                                : "border-[#e8dfce] bg-[#f8f4ec] text-[#79602e]"
                            }`}
                          >
                            {product.isActive ? "Active" : "Draft"}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[.68rem] text-[#73786b]">
                          /{product.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-48 truncate rounded-md border border-[#e4e9d4] bg-[#f6f8ef] px-2.5 py-1 text-[.68rem] font-bold text-[#53641d]">
                      {product.categoryName}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums">
                    {formatPrice(product.priceCents)}
                  </td>
                  <td className={draftOrder ? "hidden" : "px-4 py-3"}>
                    <div className="flex justify-end gap-1">
                      <Link
                        aria-label={`Edit ${product.name}`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#55594f] hover:bg-[#eef2df] hover:text-[#53641d]"
                        href={`/admin/products/${product.id}/edit`}
                        title="Edit product"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Link>
                      <Link
                        aria-label={`View ${product.name} in storefront`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#55594f] hover:bg-[#eef2df] hover:text-[#53641d]"
                        href={`/shop/${product.slug}`}
                        rel="noreferrer"
                        target="_blank"
                        title="View in storefront"
                      >
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </Link>
                      <button
                        aria-label={`Delete ${product.name}`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#8f3b36] hover:bg-red-50 hover:text-red-800"
                        onClick={() => setDeleteTarget(product)}
                        title="Delete product"
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {productsToDisplay.length === 0 && (
                <tr>
                  <td className="px-4 py-14 text-center" colSpan={4}>
                    <p className="text-sm font-bold text-[#42463b]">
                      {products.length === 0 ? "No products yet" : "No products match your filters"}
                    </p>
                    <p className="mt-1 text-xs text-[#73786b]">
                      {products.length === 0
                        ? "Add your first product to populate the catalog."
                        : "Try a different search or category."}
                    </p>
                    {products.length > 0 && (search || categoryId !== "all") && (
                      <button
                        className="mt-3 text-xs font-bold text-[#687b26] underline"
                        onClick={() => {
                          setSearch("");
                          setCategoryId("all");
                          setPage(1);
                        }}
                        type="button"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-black/10 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#73786b]">
            {draftOrder ? (
              <>
                Showing all{" "}
                <span className="font-semibold text-[#42463b]">{draftOrder.length}</span> products
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-[#42463b]">
                  {firstResult}–{lastResult}
                </span>{" "}
                of <span className="font-semibold text-[#42463b]">{filteredProducts.length}</span>{" "}
                products
              </>
            )}
          </p>
          <nav
            aria-label="Product table pagination"
            className={`${draftOrder ? "hidden" : "flex"} items-center gap-2`}
          >
            <button
              aria-label="Previous page"
              className="grid h-9 w-9 place-items-center rounded-md border border-black/15 disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="min-w-20 text-center text-xs font-semibold tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <button
              aria-label="Next page"
              className="grid h-9 w-9 place-items-center rounded-md border border-black/15 disabled:opacity-40"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </nav>
        </footer>
      </section>

      {deleteTarget && (
        <ProductDeleteDialog
          onCancel={() => setDeleteTarget(null)}
          onComplete={(result) => completeAction(result, () => setDeleteTarget(null))}
          product={deleteTarget}
        />
      )}
    </div>
  );
}
