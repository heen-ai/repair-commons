import { redirect } from "next/navigation";

export default function AdminDashboard() {
  // TODO: add auth check + real dashboard
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
      <p className="text-gray-600">Coming soon. Events and registrations are managed via the database for now.</p>
    </div>
  );
}
