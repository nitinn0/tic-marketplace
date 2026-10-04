import { Check, Minus } from "lucide-react";

import type { PermissionEntry } from "../types";

const columns: Array<{ key: keyof Omit<PermissionEntry, "functionalityCode">; label: string }> = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
];

export function PermissionSummary({
  permissions,
  filterPrefix,
  emptyLabel = "No permissions in this organization.",
}: {
  permissions: PermissionEntry[];
  filterPrefix?: string;
  emptyLabel?: string;
}) {
  const rows = filterPrefix
    ? permissions.filter((permission) => permission.functionalityCode.startsWith(filterPrefix))
    : permissions;

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Functionality
            </th>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-3 py-2 text-center font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((permission) => (
            <tr key={permission.functionalityCode}>
              <td className="px-3 py-2 font-mono text-xs text-slate-800">{permission.functionalityCode}</td>
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-center">
                  {permission[column.key] ? (
                    <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Allowed" />
                  ) : (
                    <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="Not allowed" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
