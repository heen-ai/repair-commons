import { useState, useEffect } from 'react';

interface Registration {
  id: number;
  attendee_name: string;
  attendee_email: string;
  items: string[] | null;
  status: string;
  position: number | null;
  created_at: string;
}

interface RegistrationsTableProps {
  initialRegistrations: Registration[];
}

// Client-side sortable table component
export default function RegistrationsTable({ initialRegistrations }: RegistrationsTableProps) {
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Registration | null;
    direction: 'ascending' | 'descending';
  }>({ key: null, direction: 'ascending' });

  const handleSort = (key: keyof Registration) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    }));
  };

  useEffect(() => {
    if (!sortConfig.key) return;
    
    const sorted = [...registrations].sort((a, b) => {
      // Handle null/undefined values
      const aVal = a[sortConfig.key as keyof Registration];
      const bVal = b[sortConfig.key as keyof Registration];
      
      // If one is null/undefined and the other isn't, null comes last
      if (aVal == null && bVal != null) return sortConfig.direction === 'ascending' ? 1 : -1;
      if (aVal != null && bVal == null) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal == null && bVal == null) return 0;
      
      // For items array, sort by length or first item
      if (sortConfig.key === 'items') {
        const aLen = aVal ? aVal.length : 0;
        const bLen = bVal ? bVal.length : 0;
        if (aLen < bLen) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aLen > bLen) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      }
      
      // For position (number), sort numerically
      if (sortConfig.key === 'position') {
        const aNum = aVal as number | null;
        const bNum = bVal as number | null;
        if (aNum == null && bNum != null) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (aNum != null && bNum == null) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aNum == null && bNum == null) return 0;
        return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
      }
      
      // For all other string values, sort alphabetically
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });
    
    setRegistrations(sorted);
  }, [sortConfig]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('attendee_name')}
            >
              Attendee
              {sortConfig.key === 'attendee_name' && (
                <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('attendee_email')}
            >
              Email
              {sortConfig.key === 'attendee_email' && (
                <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('items')}
            >
              Items
              {sortConfig.key === 'items' && (
                <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('status')}
            >
              Status
              {sortConfig.key === 'status' && (
                <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('position')}
            >
              Position
              {sortConfig.key === 'position' && (
                <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => handleSort('created_at')}
            >
              Registered
              {sortConfig.key === 'created_at' && (
                <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {registrations.map((reg) => (
            <tr key={reg.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{reg.attendee_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{reg.attendee_email}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900">
                  {reg.items && reg.items.length > 0 ? (
                    <span className="inline-flex flex-wrap gap-1">
                      {reg.items.map((item, idx) => (
                        <span key={idx} className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {item}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">No items</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  reg.status === "registered"
                    ? "bg-green-100 text-green-800"
                    : reg.status === "waitlisted"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {reg.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                #{reg.position || "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(reg.created_at).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}