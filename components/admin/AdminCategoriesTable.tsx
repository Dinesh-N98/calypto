"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/app/admin/catalog-actions";
import { useToast } from "@/components/ToastProvider";

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};
type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CategoryDrawer({
  category,
  onClose,
  onComplete,
}: {
  category?: CategoryRecord;
  onClose: () => void;
  onComplete: (result: ActionResult) => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const formData = new FormData(form);
    if (category) formData.set("id", category.id);

    startTransition(async () => {
      try {
        const result = category
          ? await updateCategory(formData)
          : await createCategory(formData);
        if (result.ok) onComplete(result);
        else {
          setError(result.error);
          showToast(result.error, "error");
        }
      } catch {
        const message = "The category could not be saved. Please try again.";
        setError(message);
        showToast(message, "error");
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
        aria-labelledby="category-drawer-title"
        aria-modal="true"
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="text-[.65rem] font-bold uppercase tracking-[.13em] text-[#718126]">
              Category catalog
            </p>
            <h2 className="mt-1 text-xl font-black" id="category-drawer-title">
              {category ? "Edit category" : "Create category"}
            </h2>
          </div>
          <button
            aria-label="Close category form"
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
            <label className="block text-xs font-bold text-[#55594f]">
              Category name
              <input
                autoFocus
                className="admin-catalog-input"
                maxLength={100}
                name="name"
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  if (!slugManuallyEdited) setSlug(slugify(value));
                }}
                required
                value={name}
              />
            </label>
            <label className="block text-xs font-bold text-[#55594f]">
              URL slug
              <input
                className="admin-catalog-input font-mono"
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
              <span className="mt-1 block text-xs font-normal text-[#73786b]">
                Generated from the category name; edit it here to customize.
              </span>
            </label>
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
              {pending ? "Saving..." : category ? "Save changes" : "Create category"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function CategoryDeleteDialog({
  category,
  onCancel,
  onComplete,
}: {
  category: CategoryRecord;
  onCancel: () => void;
  onComplete: (result: ActionResult) => void;
}) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function confirmDelete() {
    const formData = new FormData();
    formData.set("id", category.id);
    startTransition(async () => {
      try {
        const result = await deleteCategory(formData);
        if (result.ok) onComplete(result);
        else {
          setError(result.error);
          showToast(result.error, "error");
        }
      } catch {
        const message = "The category could not be deleted. Please try again.";
        setError(message);
        showToast(message, "error");
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
        aria-labelledby="delete-category-title"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <h2 className="text-lg font-black" id="delete-category-title">
          Delete category?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#65695f]">
          This will permanently remove{" "}
          <strong className="text-[#161812]">{category.name}</strong> from the catalog.
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
            {pending ? "Deleting..." : "Delete category"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function AdminCategoriesTable({ categories }: { categories: CategoryRecord[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [drawerCategory, setDrawerCategory] = useState<CategoryRecord | null | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return categories.filter(
      (category) =>
        !query ||
        category.name.toLocaleLowerCase().includes(query) ||
        category.slug.toLocaleLowerCase().includes(query),
    );
  }, [categories, search]);

  function completeAction(result: ActionResult, close: () => void) {
    if (!result.ok) return;
    close();
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
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Categories</h1>
          <p className="mt-2 text-sm leading-6 text-[#65695f]">
            Search, organize, and manage your storefront categories.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[#a3bd32] px-4 text-xs font-extrabold uppercase tracking-[.08em] text-[#171a14] hover:bg-[#b6cf45] sm:self-auto"
          onClick={() => setDrawerCategory(null)}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add category
        </button>
      </header>

      <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">Search categories</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#73786b]"
            />
            <input
              className="min-h-10 w-full rounded-md border border-black/15 bg-white pl-9 pr-9 text-sm outline-none focus:border-[#718126]"
              onChange={(event) => setSearch(event.target.value)}
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
                  searchRef.current?.focus();
                }}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </label>
          <p className="text-xs text-[#73786b]">
            Showing{" "}
            <span className="font-semibold text-[#42463b]">{filteredCategories.length}</span> of{" "}
            <span className="font-semibold text-[#42463b]">{categories.length}</span> categories
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-[#f7f8f5] text-[.65rem] uppercase tracking-[.1em] text-[#73786b]">
              <tr>
                <th className="px-4 py-3 font-bold">Category name</th>
                <th className="px-4 py-3 font-bold">URL slug</th>
                <th className="px-4 py-3 font-bold">Linked products</th>
                <th className="px-4 py-3 font-bold">Constraint status</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredCategories.map((category) => {
                const inUse = category.productCount > 0;
                const deleteMessage =
                  "Reassign or delete all linked products before deleting this category.";

                return (
                  <tr className="hover:bg-[#fafbf8]" key={category.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-[#161812]">{category.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-[#f1f2ee] px-2 py-1 font-mono text-xs text-[#42463b]">
                        /{category.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-[#eef2df] px-2.5 py-1 text-[.68rem] font-bold text-[#53641d]">
                        {category.productCount}{" "}
                        {category.productCount === 1 ? "product" : "products"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[.68rem] font-bold ${inUse ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}
                        title={inUse ? deleteMessage : undefined}
                      >
                        {inUse ? "In use" : "Safe to delete"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          aria-label={`Edit ${category.name}`}
                          className="grid h-9 w-9 place-items-center rounded-md text-[#55594f] hover:bg-[#eef2df] hover:text-[#53641d]"
                          onClick={() => setDrawerCategory(category)}
                          title="Edit category"
                          type="button"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <Link
                          aria-label={`View ${category.name} in storefront`}
                          className="grid h-9 w-9 place-items-center rounded-md text-[#55594f] hover:bg-[#eef2df] hover:text-[#53641d]"
                          href={`/shop?category=${encodeURIComponent(category.slug)}`}
                          rel="noreferrer"
                          target="_blank"
                          title="View in storefront"
                        >
                          <ExternalLink aria-hidden="true" className="h-4 w-4" />
                        </Link>
                        <span title={inUse ? deleteMessage : undefined}>
                          <button
                            aria-label={
                              inUse
                                ? `${deleteMessage} ${category.name}`
                                : `Delete ${category.name}`
                            }
                            className="grid h-9 w-9 place-items-center rounded-md text-[#8f3b36] hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={inUse}
                            onClick={() => setDeleteTarget(category)}
                            title={inUse ? undefined : "Delete category"}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCategories.length === 0 && (
                <tr>
                  <td className="px-4 py-14 text-center" colSpan={5}>
                    <p className="text-sm font-bold text-[#42463b]">
                      {categories.length === 0
                        ? "No categories yet"
                        : "No categories match your search"}
                    </p>
                    <p className="mt-1 text-xs text-[#73786b]">
                      {categories.length === 0
                        ? "Create a category to organize storefront products."
                        : "Try another category name or slug."}
                    </p>
                    {categories.length === 0 ? (
                      <button
                        className="mt-3 text-xs font-bold text-[#687b26] underline"
                        onClick={() => setDrawerCategory(null)}
                        type="button"
                      >
                        Create category
                      </button>
                    ) : (
                      <button
                        className="mt-3 text-xs font-bold text-[#687b26] underline"
                        onClick={() => {
                          setSearch("");
                          searchRef.current?.focus();
                        }}
                        type="button"
                      >
                        Clear search
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {drawerCategory !== undefined && (
        <CategoryDrawer
          category={drawerCategory ?? undefined}
          onClose={() => setDrawerCategory(undefined)}
          onComplete={(result) =>
            completeAction(result, () => setDrawerCategory(undefined))
          }
        />
      )}
      {deleteTarget && (
        <CategoryDeleteDialog
          category={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onComplete={(result) => completeAction(result, () => setDeleteTarget(null))}
        />
      )}
    </div>
  );
}
