"use client";

import { Reorder, useDragControls, type DragControls } from "framer-motion";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react";

export type VariantValue = {
  title: string;
  sku: string;
  size: string;
  color: string;
  price: string;
  discountPrice: string;
  stock: string;
  imageUrl: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};

export type DiscountTierValue = {
  minQuantity: string;
  discountPercentage: string;
};

const MAX_VARIANT_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_VARIANT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function uploadVariantImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/admin/product-images", {
    method: "POST",
    body: formData,
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

function VariantImagePathInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (imageUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    if (
      file.size === 0 ||
      file.size > MAX_VARIANT_IMAGE_SIZE ||
      (file.type && !ACCEPTED_VARIANT_IMAGE_TYPES.includes(file.type))
    ) {
      setUploadError("Choose a JPG, PNG, WEBP, or GIF image up to 10 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    try {
      onChange(await uploadVariantImage(file));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The image could not be uploaded.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    void uploadFile(event.dataTransfer.files[0]);
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        const relatedTarget = event.relatedTarget;
        if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
          setIsDragOver(false);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <label className="text-xs font-semibold text-[#55594f]">
        Image path <span className="font-normal text-[#73786b]">(optional)</span>
        <input
          aria-describedby={uploadError ? "variant-image-upload-error" : undefined}
          aria-invalid={Boolean(uploadError)}
          className={`admin-catalog-input ${isDragOver ? "ring-2 ring-[#718126]" : ""}`}
          maxLength={500}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/products/item/variant.webp"
          value={value}
        />
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-normal text-[#73786b]">
        <span>{isUploading ? "Uploading image…" : "Drop an image here or"}</span>
        <button
          className="font-semibold underline disabled:opacity-50"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          browse files
        </button>
        <input
          accept={ACCEPTED_VARIANT_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => void uploadFile(event.target.files?.[0])}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
      </div>
      {uploadError && (
        <p aria-live="polite" className="mt-1 text-xs font-medium text-red-700" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return items;
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function ReorderHandle({
  controls,
  label,
  onMove,
}: {
  controls: DragControls;
  label: string;
  onMove: (direction: -1 | 1) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onMove(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      onMove(1);
    }
  }

  return (
    <span
      aria-label={label}
      className="inline-flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-[#73786b] hover:bg-[#eef2df] active:cursor-grabbing"
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => controls.start(event)}
      role="button"
      tabIndex={0}
    >
      <GripVertical aria-hidden="true" className="h-4 w-4" />
    </span>
  );
}

function VariantReorderItem({
  variant,
  index,
  setVariants,
  children,
}: {
  variant: VariantValue;
  index: number;
  setVariants: Dispatch<SetStateAction<VariantValue[]>>;
  children: ReactNode;
}) {
  const controls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  function move(direction: -1 | 1) {
    setVariants((current) => moveItem(current, index, index + direction));
  }

  return (
    <Reorder.Item
      as="fieldset"
      className={`rounded-lg border border-black/10 bg-[#fafbf8] p-4 ${
        isDragging ? "bg-white shadow-lg" : ""
      }`}
      drag="y"
      dragControls={controls}
      dragListener={false}
      layout
      onDragEnd={() => setIsDragging(false)}
      onDragStart={() => setIsDragging(true)}
      value={variant}
    >
      <legend className="px-1 text-xs font-bold text-[#42463b]">Variant {index + 1}</legend>
      <div className="flex items-center gap-2">
        <ReorderHandle
          controls={controls}
          label={`Drag to reorder variant ${index + 1}`}
          onMove={move}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Reorder.Item>
  );
}

function TierReorderItem({
  tier,
  index,
  setTiers,
  children,
}: {
  tier: DiscountTierValue;
  index: number;
  setTiers: Dispatch<SetStateAction<DiscountTierValue[]>>;
  children: ReactNode;
}) {
  const controls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  function move(direction: -1 | 1) {
    setTiers((current) => moveItem(current, index, index + direction));
  }

  return (
    <Reorder.Item
      as="div"
      className={`flex items-end gap-2 ${isDragging ? "rounded-lg bg-white p-2 shadow-lg" : ""}`}
      drag="y"
      dragControls={controls}
      dragListener={false}
      layout
      onDragEnd={() => setIsDragging(false)}
      onDragStart={() => setIsDragging(true)}
      value={tier}
    >
      <ReorderHandle
        controls={controls}
        label={`Drag to reorder tier ${index + 1}`}
        onMove={move}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </Reorder.Item>
  );
}

function createVariant(basePrice: string): VariantValue {
  return {
    title: "",
    sku: "",
    size: "",
    color: "",
    price: basePrice,
    discountPrice: "",
    stock: "0",
    imageUrl: "",
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
  };
}

function serializeVariant(variant: VariantValue) {
  const size = variant.size.trim();
  const color = variant.color.trim();
  return {
    title: size || color ? "" : variant.title.trim(),
    sku: variant.sku.trim(),
    size,
    color,
    price: variant.price,
    discountPrice: variant.discountPrice,
    stock: Number(variant.stock),
    imageUrl: variant.imageUrl.trim(),
    weightKg: variant.weightKg ? Number(variant.weightKg) : null,
    lengthCm: variant.lengthCm ? Number(variant.lengthCm) : null,
    widthCm: variant.widthCm ? Number(variant.widthCm) : null,
    heightCm: variant.heightCm ? Number(variant.heightCm) : null,
  };
}

export function ProductVariantBuilder({
  initialVariants = [],
  basePrice = "",
}: {
  initialVariants?: VariantValue[];
  basePrice?: string;
}) {
  const [variants, setVariants] = useState(initialVariants);

  function updateVariant(index: number, patch: Partial<VariantValue>) {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  }

  function duplicateVariant(index: number) {
    const source = variants[index];
    if (!source || variants.length >= 100) return;
    const duplicate = {
      ...source,
      title: source.title ? `${source.title} copy` : "",
      sku: "",
      size: "",
      color: "",
    };
    setVariants((current) => [
      ...current.slice(0, index + 1),
      duplicate,
      ...current.slice(index + 1),
    ]);
  }

  return (
    <div className="space-y-4">
      <input name="variants" type="hidden" value={JSON.stringify(variants.map(serializeVariant))} />
      {variants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 bg-[#fafbf8] px-4 py-5 text-sm text-[#65695f]">
          No variants added. The product will use its base price and default stock.
        </p>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          className="space-y-4"
          onReorder={setVariants}
          values={variants}
        >
          {variants.map((variant, index) => (
            <VariantReorderItem
              index={index}
              key={index}
              setVariants={setVariants}
              variant={variant}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label className="text-xs font-semibold text-[#55594f]">
                  Variant title
                  <input
                    className="admin-catalog-input"
                    maxLength={100}
                    onChange={(event) => updateVariant(index, { title: event.target.value })}
                    placeholder="e.g. 3 inch · Green"
                    value={variant.title}
                  />
                </label>
                <label className="text-xs font-semibold text-[#55594f]">
                  SKU <span className="font-normal text-[#73786b]">(optional)</span>
                  <input
                    className="admin-catalog-input font-mono"
                    maxLength={80}
                    onChange={(event) => updateVariant(index, { sku: event.target.value })}
                    placeholder="Generated if blank"
                    value={variant.sku}
                  />
                </label>
                <label className="text-xs font-semibold text-[#55594f]">
                  Variant price (USD)
                  <input
                    className="admin-catalog-input"
                    min="0.01"
                    onChange={(event) => updateVariant(index, { price: event.target.value })}
                    required
                    step="0.01"
                    type="number"
                    value={variant.price}
                  />
                </label>
                <label className="text-xs font-semibold text-[#55594f]">
                  Stock quantity
                  <input
                    className="admin-catalog-input"
                    min="0"
                    onChange={(event) => updateVariant(index, { stock: event.target.value })}
                    required
                    step="1"
                    type="number"
                    value={variant.stock}
                  />
                </label>
                <label className="text-xs font-semibold text-[#55594f]">
                  Size
                  <input
                    className="admin-catalog-input"
                    maxLength={100}
                    onChange={(event) => updateVariant(index, { size: event.target.value })}
                    placeholder="Optional"
                    value={variant.size}
                  />
                </label>
                <label className="text-xs font-semibold text-[#55594f]">
                  Color
                  <input
                    className="admin-catalog-input"
                    maxLength={100}
                    onChange={(event) => updateVariant(index, { color: event.target.value })}
                    placeholder="Optional"
                    value={variant.color}
                  />
                </label>
                <label className="text-xs font-semibold text-[#55594f]">
                  Variant sale price (USD)
                  <input
                    className="admin-catalog-input"
                    min="0.01"
                    onChange={(event) =>
                      updateVariant(index, { discountPrice: event.target.value })
                    }
                    placeholder="Optional"
                    step="0.01"
                    type="number"
                    value={variant.discountPrice}
                  />
                </label>
                <div className="sm:col-span-2 xl:col-span-3">
                  <VariantImagePathInput
                    onChange={(imageUrl) => updateVariant(index, { imageUrl })}
                    value={variant.imageUrl}
                  />
                </div>
                <div className="sm:col-span-2 xl:col-span-3">
                  <p className="mb-2 text-[.65rem] font-bold uppercase tracking-wide text-[#73786b]">
                    Shipping dimensions <span className="font-normal normal-case">(optional)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(
                      [
                        ["weightKg", "Weight (kg)"],
                        ["lengthCm", "Length (cm)"],
                        ["widthCm", "Width (cm)"],
                        ["heightCm", "Height (cm)"],
                      ] as const
                    ).map(([key, label]) => (
                      <label className="text-xs font-semibold text-[#55594f]" key={key}>
                        {label}
                        <input
                          className="admin-catalog-input"
                          min="0.01"
                          onChange={(event) => updateVariant(index, { [key]: event.target.value })}
                          placeholder="—"
                          step="any"
                          type="number"
                          value={variant[key]}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t border-black/5 pt-3">
                <button
                  aria-label={`Duplicate variant ${index + 1}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-semibold text-[#42463b] transition hover:bg-[#eef2df]"
                  disabled={variants.length >= 100}
                  onClick={() => duplicateVariant(index)}
                  type="button"
                >
                  <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  aria-label={`Remove variant ${index + 1}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-800/15 bg-white px-3 text-xs font-semibold text-red-800 transition hover:bg-red-50"
                  onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </VariantReorderItem>
          ))}
        </Reorder.Group>
      )}
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#718126]/30 bg-[#f7f9ef] px-4 text-xs font-bold text-[#53641d] transition hover:bg-[#eef2df] disabled:opacity-50"
        disabled={variants.length >= 100}
        onClick={() => setVariants((current) => [...current, createVariant(basePrice)])}
        type="button"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add variant
      </button>
    </div>
  );
}

export function ProductDiscountTierBuilder({
  initialTiers = [],
}: {
  initialTiers?: DiscountTierValue[];
}) {
  const [tiers, setTiers] = useState(initialTiers);
  const sortedTiers = [...tiers].sort(
    (first, second) => Number(first.minQuantity) - Number(second.minQuantity),
  );
  const enteredQuantities = tiers
    .map((tier) => tier.minQuantity.trim())
    .filter(Boolean)
    .map(Number);
  const duplicateQuantity = new Set(enteredQuantities).size !== enteredQuantities.length;
  const discountOrderInvalid = sortedTiers.some(
    (tier, index) =>
      index > 0 &&
      tier.discountPercentage !== "" &&
      sortedTiers[index - 1].discountPercentage !== "" &&
      Number(tier.discountPercentage) <= Number(sortedTiers[index - 1].discountPercentage),
  );
  const tierValidationMessage = duplicateQuantity
    ? "Each minimum quantity must be unique."
    : discountOrderInvalid
      ? "Discount percentages must increase with minimum quantity."
      : "";

  return (
    <div className="space-y-3">
      <input name="tieredDiscounts" type="hidden" value={JSON.stringify(tiers)} />
      {tiers.length === 0 ? (
        <p className="text-xs text-[#73786b]">No volume discounts configured.</p>
      ) : (
        <Reorder.Group as="div" axis="y" className="space-y-3" onReorder={setTiers} values={tiers}>
          {tiers.map((tier, index) => (
            <TierReorderItem index={index} key={index} setTiers={setTiers} tier={tier}>
              <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="text-xs font-semibold text-[#55594f]">
                  Minimum quantity
                  <input
                    className="admin-catalog-input"
                    min="2"
                    onChange={(event) =>
                      setTiers((current) =>
                        current.map((value, i) =>
                          i === index ? { ...value, minQuantity: event.target.value } : value,
                        ),
                      )
                    }
                    required
                    step="1"
                    type="number"
                    value={tier.minQuantity}
                  />
                </label>
                <label className="text-xs font-semibold text-[#55594f]">
                  Discount (%)
                  <input
                    className="admin-catalog-input"
                    max="99"
                    min="1"
                    onChange={(event) =>
                      setTiers((current) =>
                        current.map((value, i) =>
                          i === index
                            ? { ...value, discountPercentage: event.target.value }
                            : value,
                        ),
                      )
                    }
                    required
                    step="1"
                    type="number"
                    value={tier.discountPercentage}
                  />
                </label>
                <button
                  aria-label={`Remove discount tier ${index + 1}`}
                  className="mb-0.5 grid h-10 w-10 place-items-center rounded-lg border border-red-800/15 text-red-800 transition hover:bg-red-50"
                  onClick={() => setTiers((current) => current.filter((_, i) => i !== index))}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </TierReorderItem>
          ))}
        </Reorder.Group>
      )}
      <button
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-bold text-[#42463b] transition hover:bg-[#f4f5f1]"
        disabled={tiers.length >= 20}
        onClick={() =>
          setTiers((current) => [...current, { minQuantity: "", discountPercentage: "" }])
        }
        type="button"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {tiers.length >= 20 ? "Maximum tiers added" : "Add discount tier"}
      </button>
      {tierValidationMessage && (
        <p aria-live="polite" className="text-xs font-medium text-red-700" role="alert">
          {tierValidationMessage}
        </p>
      )}
    </div>
  );
}

export function ProductTagInput({ initialTags = [] }: { initialTags?: string[] }) {
  const [tags, setTags] = useState(initialTags);
  const [input, setInput] = useState("");

  function addTag(value: string) {
    const tag = value.trim().replace(/,$/u, "").trim();
    if (!tag) return;
    setTags((current) =>
      current.length >= 30 ||
      current.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())
        ? current
        : [...current, tag],
    );
    setInput("");
  }

  return (
    <div>
      <input name="tags" type="hidden" value={tags.join(", ")} />
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-black/15 bg-white p-2 focus-within:ring-2 focus-within:ring-[#718126]/20">
        {tags.map((tag, index) => (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-[#e4e9d4] bg-[#f6f8ef] py-1 pl-2.5 pr-1 text-xs font-semibold text-[#53641d]"
            key={`${tag}-${index}`}
          >
            {tag}
            <button
              aria-label={`Remove ${tag} tag`}
              className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-[#e4e9d4]"
              onClick={() => setTags((current) => current.filter((_, i) => i !== index))}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        ))}
        <input
          aria-label="Add tag"
          className="min-h-7 min-w-24 flex-1 border-0 bg-transparent px-1 text-sm outline-none"
          maxLength={40}
          onBlur={() => addTag(input)}
          onChange={(event) => {
            const value = event.target.value;
            if (value.includes(",")) {
              const parts = value.split(",");
              parts.slice(0, -1).forEach(addTag);
              setInput(parts.at(-1) ?? "");
            } else {
              setInput(value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(input);
            } else if (event.key === "Backspace" && !input && tags.length) {
              setTags((current) => current.slice(0, -1));
            }
          }}
          placeholder={tags.length ? "Add another…" : "Type a tag and press Enter"}
          value={input}
        />
      </div>
      <p className="mt-1 text-[11px] text-[#73786b]">Up to 30 tags, 40 characters each.</p>
    </div>
  );
}
