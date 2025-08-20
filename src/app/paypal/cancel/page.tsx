import Link from "next/link";

export default function PayPalCancelPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-4">Payment canceled</h1>
      <p className="text-gray-700 mb-6">
        You canceled the PayPal approval flow. No charges were made.
      </p>
      <Link
        href="/events"
        className="inline-block px-4 py-2 rounded bg-black text-white"
      >
        Back to events
      </Link>
    </div>
  );
}
