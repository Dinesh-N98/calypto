const adminSections = [
  {
    id: "products",
    title: "Products",
    description: "Product catalog tools will be available here.",
  },
  {
    id: "orders",
    title: "Orders",
    description: "Order management tools will be available here.",
  },
  {
    id: "customers",
    title: "Customers",
    description: "Customer management tools will be available here.",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="admin-page-title" id="overview">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#718126]">Workspace</p>
        <h1
          className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl"
          id="admin-page-title"
        >
          Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65695f]">
          Welcome to Calypto administration. Admin tools and store activity will appear here.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminSections.map((section) => (
          <section
            aria-labelledby={`${section.id}-title`}
            className="scroll-mt-24 rounded-lg border border-black/10 bg-white p-5 shadow-sm sm:p-7"
            id={section.id}
            key={section.id}
          >
            <h2 className="text-base font-bold" id={`${section.id}-title`}>
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#65695f]">{section.description}</p>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.1em] text-[#718126]">
              Coming soon
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
