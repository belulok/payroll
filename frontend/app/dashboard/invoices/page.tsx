export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-2">Manage client invoices and billing</p>
        </div>
        <div className="flex gap-3">
          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
            New Feature
          </span>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md">
            + Create Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Invoices management coming soon...</p>
      </div>
    </div>
  );
}

