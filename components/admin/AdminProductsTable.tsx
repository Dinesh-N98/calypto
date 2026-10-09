"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createProduct, deleteProduct, updateProduct } from "@/app/admin/catalog-actions";
import { useToast } from "@/components/ToastProvider";
import { formatPrice } from "@/lib/currency";

type CategoryOption = {
  id: string;
  name: string;
  tieredDiscountsEnabled: boolean;
};
type ProductRecord = {
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
  }[];
  tieredDiscounts: { minQuantity: number; discountPercentage: number }[];
  categoryId: string;
  categoryName: string;
};
type ActionResult = { ok: true; message: string } | { ok: false; error: string };
type DrawerMode = { type: "create" } | { type: "edit"; product: ProductRecord };

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
}: {
  categories: CategoryOption[];
  product?: ProductRecord;
  imageUrl: string;
  onImageUrlChange: (imageUrl: string) => void;
  galleryUrls: string[];
  onGalleryUrlsChange: (urls: string[]) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId ?? "");
  const [priceInput, setPriceInput] = useState(
    product ? (product.priceCents / 100).toFixed(2) : "",
  );
  const [salePriceInput, setSalePriceInput] = useState(
    product?.salePriceCents ? (product.salePriceCents / 100).toFixed(2) : "",
  );
  const [originalPriceInput, setOriginalPriceInput] = useState(
    product?.originalPriceCents ? (product.originalPriceCents / 100).toFixed(2) : "",
  );
  const [discountAmountInput, setDiscountAmountInput] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(product?.imageUrl ?? "");
  const [imageError, setImageError] = useState("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const discountBase = Number(originalPriceInput || priceInput);
  const discountSalePrice = discountAmountInput
    ? discountBase - Number(discountAmountInput)
    : Number(salePriceInput);
  const discountPercent =
    discountBase > 0 && discountSalePrice > 0 && discountSalePrice < discountBase
      ? Math.round(((discountBase - discountSalePrice) / discountBase) * 100)
      : null;
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  useEffect(
    () => () => {
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
    },
    [],
  );

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (
      file.type &&
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
    ) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          Product name
          <input
            autoFocus
            className="admin-catalog-input"
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
        </label>
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          URL slug
          <input
            className="admin-catalog-input"
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
        </label>
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          Brand
          <input
            className="admin-catalog-input"
            defaultValue={product?.brand ?? ""}
            maxLength={100}
            name="brand"
            placeholder="Brand name"
          />
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Price (USD)
          <input
            className="admin-catalog-input"
            onChange={(event) => setPriceInput(event.target.value)}
            inputMode="decimal"
            min="0.01"
            name="price"
            placeholder="9.99"
            required
            step="0.01"
            type="number"
            value={priceInput}
          />
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Sale price (USD)
          <input
            className="admin-catalog-input"
            onChange={(event) => {
              setSalePriceInput(event.target.value);
              if (event.target.value) setDiscountAmountInput("");
            }}
            min="0.01"
            name="salePrice"
            placeholder="Optional"
            step="0.01"
            type="number"
            value={salePriceInput}
          />
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Discount amount (USD)
          <input
            className="admin-catalog-input"
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
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Original price (USD)
          <input
            className="admin-catalog-input"
            onChange={(event) => setOriginalPriceInput(event.target.value)}
            min="0.01"
            name="originalPrice"
            placeholder="Optional"
            step="0.01"
            type="number"
            value={originalPriceInput}
          />
        </label>
        <p className="text-xs font-normal text-[#73786b] md:col-span-2">
          Enter either a sale price or discount amount.{" "}
          {discountPercent === null
            ? "Enter a valid original price and lower sale/discount value to preview savings."
            : `Sale price: $${discountSalePrice.toFixed(2)} · ${discountPercent}% off`}
        </p>
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          Sale ends at
          <input
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
          <span className="mt-1 block text-[11px] font-normal">
            Required when a sale price is set.
          </span>
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Category
          <select
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
        </label>
        <label className="text-xs font-bold text-[#55594f]">
          Quantity discount setting
          <select
            className="admin-catalog-input"
            defaultValue={
              product?.tieredDiscountsEnabled === null ||
              product?.tieredDiscountsEnabled === undefined
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
            {(selectedCategory?.tieredDiscountsEnabled ??
              product?.categoryTieredDiscountsEnabled ??
              false)
              ? "enabled"
              : "disabled"}.
          </span>
        </label>
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
                        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)),
                  );
                  if (invalid) {
                    setImageError("Gallery images must be JPG, PNG, WEBP, or GIF files up to 10 MB.");
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
                <ul className="mt-2 grid gap-1">
                  {galleryUrls.map((url) => (
                    <li className="flex items-center justify-between gap-2 font-normal" key={url}>
                      <span className="min-w-0 truncate">{url}</span>
                      <button
                        className="shrink-0 underline"
                        onClick={() =>
                          onGalleryUrlsChange(galleryUrls.filter((galleryUrl) => galleryUrl !== url))
                        }
                        type="button"
                      >
                        Remove
                      </button>
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
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          Description
          <textarea
            className="admin-catalog-input min-h-28 py-3"
            defaultValue={product?.description}
            maxLength={5000}
            name="description"
            required
            rows={5}
          />
        </label>
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          Variants (JSON)
          <textarea
            className="admin-catalog-input min-h-36 py-3 font-mono text-xs"
            defaultValue={JSON.stringify(
              product?.variants.map((variant) => ({
                sku: variant.sku,
                size: variant.size ?? "",
                color: variant.color ?? "",
                price: (variant.priceCents / 100).toFixed(2),
                discountPrice: variant.discountPriceCents
                  ? (variant.discountPriceCents / 100).toFixed(2)
                  : "",
                stock: variant.stock,
                imageUrl: variant.imageUrl ?? "",
              })) ?? [],
              null,
              2,
            )}
            name="variants"
            spellCheck={false}
            placeholder="[]"
          />
          <span className="mt-1 block text-[11px] font-normal">
            Leave empty to create a hidden default variant using the product price and default
            stock. Otherwise each row needs a price and non-negative stock; SKU is optional and
            generated automatically. Size, color, discountPrice, and imageUrl are optional.
          </span>
        </label>
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          Default variant stock
          <input
            className="admin-catalog-input"
            defaultValue={
              product?.variants.length === 1 &&
              !product.variants[0].size &&
              !product.variants[0].color
                ? product.variants[0].stock
                : 0
            }
            min="0"
            name="defaultStock"
            step="1"
            type="number"
          />
          <span className="mt-1 block text-[11px] font-normal">
            Used when the variant list is empty. Stock remains zero until you enter inventory.
          </span>
        </label>
        <label className="text-xs font-bold text-[#55594f] md:col-span-2">
          Quantity discounts (JSON)
          <textarea
            className="admin-catalog-input min-h-20 py-3 font-mono text-xs"
            defaultValue={JSON.stringify(product?.tieredDiscounts ?? [], null, 2)}
            name="tieredDiscounts"
            spellCheck={false}
          />
          <span className="mt-1 block text-[11px] font-normal">
            Example: [{"{"}&quot;minQuantity&quot;:2,&quot;discountPercentage&quot;:10{"}"}]
          </span>
        </label>
      </div>
    </>
  );
}

function ProductDrawer({
  categories,
  mode,
  onClose,
  onComplete,
}: {
  categories: CategoryOption[];
  mode: DrawerMode;
  onClose: () => void;
  onComplete: (result: ActionResult) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const product = mode.type === "edit" ? mode.product : undefined;
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [galleryUrls, setGalleryUrls] = useState(product?.images.map((image) => image.url) ?? []);

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
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
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
        const nextGallery = [...new Set([...uploadedImageUrls, ...savedGallery])];
        setGalleryUrls(nextGallery);
        formData.set("imageUrls", JSON.stringify(nextGallery));
        formData.delete("imageFile");
        formData.delete("galleryImages");

        const result =
          mode.type === "edit" ? await updateProduct(formData) : await createProduct(formData);
        if (result.ok) onComplete(result);
        else {
          if (uploadedImageUrls.length > 0) {
            setError(`${result.error} The uploaded images are still stored and can be reused.`);
          } else {
            setError(result.error);
          }
        }
      } catch {
        if (uploadedGalleryImageUrls.length > 0) {
          setGalleryUrls((current) => [...new Set([...current, ...uploadedGalleryImageUrls])]);
        }
        const imageInput = form.elements.namedItem("imageFile");
        if (imageInput instanceof HTMLInputElement) imageInput.value = "";
        const galleryInput = form.elements.namedItem("galleryImages");
        if (galleryInput instanceof HTMLInputElement) galleryInput.value = "";
        setError(
          uploadedImageUrls.length > 0
            ? "The product could not be saved. Uploaded images are still stored and can be reused."
            : "The product could not be saved. Please try again.",
        );
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        aria-labelledby="product-drawer-title"
        aria-modal="true"
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="text-[.65rem] font-bold uppercase tracking-[.13em] text-[#718126]">
              Product catalog
            </p>
            <h2 className="mt-1 text-xl font-black" id="product-drawer-title">
              {product ? "Edit product" : "Create product"}
            </h2>
          </div>
          <button
            aria-label="Close product form"
            className="grid h-10 w-10 place-items-center rounded-md text-[#55594f] hover:bg-black/5"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <p
                aria-live="assertive"
                className="rounded-md border border-red-700/20 bg-red-50 px-3 py-2 text-sm text-red-800"
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
              product={product}
            />
          </div>
          <footer className="flex justify-end gap-3 border-t border-black/10 px-6 py-4">
            <button
              className="min-h-11 rounded-md border border-black/15 px-4 text-xs font-bold hover:bg-[#f4f5f1]"
              disabled={pending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-[#a3bd32] px-5 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45]"
              disabled={pending}
              type="submit"
            >
              {pending ? "Saving..." : product ? "Save changes" : "Create product"}
            </button>
          </footer>
        </form>
      </section>
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
  const [drawer, setDrawer] = useState<DrawerMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);

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
  const firstResult = filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastResult = Math.min(currentPage * pageSize, filteredProducts.length);

  function completeAction(result: ActionResult, close?: () => void) {
    if (!result.ok) return;
    close?.();
    showToast(result.message);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-xs font-bold text-[#687b26] hover:underline" href="/admin">
            Admin dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Products</h1>
          <p className="mt-2 text-sm leading-6 text-[#65695f]">
            Search, organize, and manage your storefront catalog.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[#a3bd32] px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45] sm:self-auto"
          disabled={categories.length === 0}
          onClick={() => setDrawer({ type: "create" })}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add product
        </button>
      </header>

      {categories.length === 0 && (
        <p className="rounded-md border border-amber-700/20 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Create a category before adding products.{" "}
          <Link className="font-bold underline" href="/admin/categories">
            Manage categories
          </Link>
        </p>
      )}

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">Search products</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73786b]"
            />
            <input
              className="min-h-10 w-full rounded-md border border-black/15 bg-white pl-9 pr-9 text-sm outline-none focus:border-[#718126]"
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
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#55594f]">
              Category
              <select
                className="min-h-10 rounded-md border border-black/15 bg-white px-3 text-xs font-semibold"
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
                className="min-h-10 rounded-md border border-black/15 bg-white px-3 text-xs font-semibold"
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[#f7f8f5] text-[.65rem] uppercase tracking-[.1em] text-[#73786b]">
              <tr>
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 text-right font-bold">Price</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {visibleProducts.map((product) => (
                <tr className="hover:bg-[#fafbf8]" key={product.id}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#e4e4d9]">
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
                        <p className="truncate text-sm font-bold text-[#161812]">{product.name}</p>
                        <p className="mt-0.5 truncate text-xs text-[#73786b]">/{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-48 truncate rounded-full bg-[#eef2df] px-2.5 py-1 text-[.68rem] font-bold text-[#53641d]">
                      {product.categoryName}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums">
                    {formatPrice(product.priceCents)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        aria-label={`Edit ${product.name}`}
                        className="grid h-9 w-9 place-items-center rounded-md text-[#55594f] hover:bg-[#eef2df] hover:text-[#53641d]"
                        onClick={() => setDrawer({ type: "edit", product })}
                        title="Edit product"
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
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
              {visibleProducts.length === 0 && (
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

        <footer className="flex flex-col gap-3 border-t border-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#73786b]">
            Showing{" "}
            <span className="font-semibold text-[#42463b]">
              {firstResult}–{lastResult}
            </span>{" "}
            of <span className="font-semibold text-[#42463b]">{filteredProducts.length}</span>{" "}
            products
          </p>
          <nav aria-label="Product table pagination" className="flex items-center gap-2">
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

      {drawer && (
        <ProductDrawer
          categories={categories}
          mode={drawer}
          onClose={() => setDrawer(null)}
          onComplete={(result) => completeAction(result, () => setDrawer(null))}
        />
      )}
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
